// day 7: Fans an event out to every active endpoint for an API key.
//
// Pre-creates the WebhookDelivery row in `pending` and uses its id as the
// BullMQ jobId — so deliveryId == job.id and the worker can update the row
// without an extra lookup. Per-endpoint failures are isolated so one bad
// row doesn't abort the whole fan-out.

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_QUEUE,
} from '../queue/queue.constants';
import type { WebhookJobData } from '../queue/webhook.worker';

export type WebhookEvent = 'job.completed' | 'job.failed';

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(WEBHOOK_QUEUE)
    private readonly queue: Queue<WebhookJobData>,
  ) {}

  async dispatch(
    apiKeyId: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    // Best-effort: dispatch failures must never bubble into the completion job.
    try {
      const endpoints = await this.prisma.webhookEndpoint.findMany({
        where: { apiKeyId, isActive: true },
        select: { id: true },
      });

      if (endpoints.length === 0) return;

      await Promise.allSettled(
        endpoints.map((e) => this.enqueueOne(e.id, event, payload)),
      );
    } catch (err) {
      this.logger.error(
        `Dispatch failed for apiKey ${apiKeyId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async enqueueOne(
    endpointId: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const deliveryId = crypto.randomUUID();

    try {
      // Row first — if this insert fails, we never enqueue.
      await this.prisma.webhookDelivery.create({
        data: {
          id: deliveryId,
          webhookEndpointId: endpointId,
          bullJobId: deliveryId,
          event,
          payload: payload as object,
          status: 'pending',
          attemptCount: 0,
        },
      });

      await this.queue.add(
        'deliver',
        { deliveryId, endpointId, event, payload },
        {
          jobId: deliveryId,
          attempts: WEBHOOK_MAX_ATTEMPTS,
          backoff: { type: 'custom' },
          removeOnComplete: 1000,
          removeOnFail: { count: 5000 },
        },
      );
    } catch (err) {
      this.logger.error(
        `Failed to enqueue webhook for endpoint ${endpointId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
