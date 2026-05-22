// day 7: BullMQ processor for WEBHOOK_QUEUE.
//
// Contract — dispatcher (Step 4) creates the WebhookDelivery row in `pending`
// and enqueues with jobId == deliveryId. This worker only UPDATES that row.
//
// Per attempt:
//   1. Load endpoint. If revoked/missing -> mark failed (no retry).
//   2. POST the payload with a 5s timeout.
//   3. 2xx -> mark `success` (statusCode + truncated body + latency + deliveredAt).
//   4. non-2xx / network / timeout -> mark `failed`, throw so BullMQ retries
//      using the webhook-fixed backoff (1s, 5s, 30s, 2min).
//   5. After max attempts BullMQ emits `failed` -> Step 7 marks `dead_letter`.
//
// Signing headers are a placeholder here — Step 6 swaps in the real HMAC.

import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WEBHOOK_QUEUE, webhookBackoffStrategy } from './queue.constants';
// day 7: HMAC signer for X-Gateway-Signature.
import { signWebhookPayload } from './webhook-signer';

export type WebhookJobData = {
  deliveryId: string;
  endpointId: string;
  event: 'job.completed' | 'job.failed';
  payload: Record<string, unknown>;
};

type DeliveryOutcome =
  | { ok: true; statusCode: number; responseBody: string; latencyMs: number }
  | {
      ok: false;
      statusCode: number | null;
      responseBody: string | null;
      latencyMs: number;
      errorMessage: string;
    };

const REQUEST_TIMEOUT_MS = 5_000;
const RESPONSE_BODY_MAX_BYTES = 2_048;

@Processor(WEBHOOK_QUEUE, {
  settings: { backoffStrategy: webhookBackoffStrategy },
})
export class WebhookWorker extends WorkerHost {
  private readonly logger = new Logger(WebhookWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<WebhookJobData>): Promise<void> {
    const { deliveryId, endpointId, event, payload } = job.data;
    const attemptCount = job.attemptsMade + 1; // 1-indexed: 1 on first try

    const endpoint = await this.prisma.webhookEndpoint.findUnique({
      where: { id: endpointId },
    });

    // Revoked or deleted between enqueue and delivery — don't retry.
    if (!endpoint || !endpoint.isActive) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'failed',
          attemptCount,
          errorMessage: 'Endpoint revoked or missing',
        },
      });
      return;
    }

    const outcome = await this.deliver({
      url: endpoint.url,
      secret: endpoint.secret,
      event,
      payload,
    });

    if (outcome.ok) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'success',
          statusCode: outcome.statusCode,
          responseBody: outcome.responseBody,
          latencyMs: outcome.latencyMs,
          attemptCount,
          deliveredAt: new Date(),
          errorMessage: null,
        },
      });
      return;
    }

    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'failed',
        statusCode: outcome.statusCode,
        responseBody: outcome.responseBody,
        latencyMs: outcome.latencyMs,
        attemptCount,
        errorMessage: outcome.errorMessage,
      },
    });

    // Throw so BullMQ schedules the next retry via webhookBackoffStrategy.
    throw new Error(outcome.errorMessage);
  }

  // Fires HTTP, normalizes both transport failures and non-2xx into one shape.
  private async deliver(args: {
    url: string;
    secret: string;
    event: WebhookJobData['event'];
    payload: Record<string, unknown>;
  }): Promise<DeliveryOutcome> {
    const { url, secret, event, payload } = args;
    const startedAt = Date.now();
    const body = JSON.stringify(payload);
    const timestamp = Date.now();
    const signature = signWebhookPayload(secret, timestamp, body);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Event': event,
          'X-Gateway-Timestamp': String(timestamp),
          'X-Gateway-Signature': signature,
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const responseBody = (await response.text()).slice(
        0,
        RESPONSE_BODY_MAX_BYTES,
      );
      const latencyMs = Date.now() - startedAt;

      if (response.ok) {
        return {
          ok: true,
          statusCode: response.status,
          responseBody,
          latencyMs,
        };
      }

      return {
        ok: false,
        statusCode: response.status,
        responseBody,
        latencyMs,
        errorMessage: `HTTP ${response.status}`,
      };
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        statusCode: null,
        responseBody: null,
        latencyMs,
        errorMessage: message || 'Delivery failed',
      };
    }
  }

  // day 7: fires on every failed attempt — terminal only when attemptsMade
  // has reached the configured attempts cap. Flip the row to dead_letter and
  // emit a structured log entry (stub for a real notification channel).
  @OnWorkerEvent('failed')
  async onFailed(job: Job<WebhookJobData>, error: Error): Promise<void> {
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < attempts) return;

    const { deliveryId, endpointId, event } = job.data;

    try {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: { status: 'dead_letter' },
      });
    } catch (err) {
      this.logger.error(
        `Failed to mark delivery ${deliveryId} as dead_letter: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    // Structured log — picked up by log aggregators / alert pipelines.
    this.logger.error(
      JSON.stringify({
        type: 'webhook.dead_letter',
        deliveryId,
        endpointId,
        event,
        attempts: job.attemptsMade,
        lastError: error.message,
      }),
    );
  }
}
