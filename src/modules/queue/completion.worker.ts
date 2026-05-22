import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { COMPLETION_QUEUE } from './queue.constants';
import { ProvidersService } from '../providers/providers.service';
import { UsageService } from '../usage/usage.service';

@Processor(COMPLETION_QUEUE)
export class CompletionWorker extends WorkerHost {
  private readonly logger = new Logger(CompletionWorker.name);
  constructor(
    private readonly providers: ProvidersService,
    private readonly usage: UsageService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.id}`);

    const { prompt, provider, model, apiKeyRecord } = job.data;
    const startTime = Date.now();

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

    return {
      text: result.text,
      provider: result.provider,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    };
  }
}
