import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { COMPLETION_QUEUE } from '../queue/queue.constants';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(COMPLETION_QUEUE) private readonly completionQueue: Queue,
  ) {}

  async enqueue(data: {
    prompt: string;
    provider?: string;
    model?: string;
    apiKeyId: string;
  }) {
    const job = await this.completionQueue.add('complete', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    return { jobId: job.id };
  }

  async getJobStatus(jobId: string, apiKeyId: string) {
    const job = await this.completionQueue.getJob(jobId);
    if (!job) return null;

    // Ownership check: a key may only read its own jobs. Job IDs are
    // sequential, so without this any key could read another's results.
    if (job.data?.apiKeyId !== apiKeyId) return null;

    const state = await job.getState();
    const result = job.returnvalue ?? null;
    const failedReason = job.failedReason ?? null;

    return { jobId, state, result, failedReason };
  }
}
