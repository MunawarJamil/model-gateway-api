import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { COMPLETION_QUEUE } from './queue.constants';
import { ProvidersService } from '../providers/providers.service';
import { UsageService } from '../usage/usage.service';
// day 7: dispatcher lives in WebhooksModule — forwardRef breaks the
// QueueModule <-> WebhooksModule cycle.
import { WebhookDispatcherService } from '../webhooks/webhook-dispatcher.service';

@Processor(COMPLETION_QUEUE)
export class CompletionWorker extends WorkerHost {
  private readonly logger = new Logger(CompletionWorker.name);
  constructor(
    private readonly providers: ProvidersService,
    private readonly usage: UsageService,
    // day 7: fire job.completed / job.failed events to registered webhooks.
    @Inject(forwardRef(() => WebhookDispatcherService))
    private readonly dispatcher: WebhookDispatcherService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.id}`);

    const { prompt, provider, model, apiKeyRecord } = job.data;
    const startTime = Date.now();

    try {
      const result = await this.providers.complete(provider ?? 'groq', {
        prompt,
        model,
      });

      await this.usage.logRequest({
        apiKeyId: apiKeyRecord.id,
        provider: result.provider,
        model: result.model,
        prompt,
        response: result.text,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs: Date.now() - startTime,
        type: 'async',
        status: 'success',
      });

      const response = {
        text: result.text,
        provider: result.provider,
        model: result.model,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
      };

      // day 7: fire job.completed exactly once on success.
      await this.dispatcher.dispatch(apiKeyRecord.id, 'job.completed', {
        jobId: job.id,
        ...response,
        completedAt: new Date().toISOString(),
      });

      return response;
    } catch (err) {
      // day 7: only fire job.failed on the *terminal* failure — not on every
      // retry. BullMQ rewrites attemptsMade before this catch runs, so the
      // condition "this attempt was the last" is attemptsMade >= attempts.
      const attempts = job.opts.attempts ?? 1;
      const isFinalAttempt = job.attemptsMade + 1 >= attempts;

      if (isFinalAttempt) {
        await this.dispatcher.dispatch(apiKeyRecord.id, 'job.failed', {
          jobId: job.id,
          error: err instanceof Error ? err.message : String(err),
          failedAt: new Date().toISOString(),
        });
      }

      throw err;
    }
  }
}
