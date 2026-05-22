import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { COMPLETION_QUEUE } from './queue.constants';
import { CompletionWorker } from './completion.worker';
import * as dotenv from 'dotenv';
import { UsageModule } from '../usage/usage.module';
import { ProvidersModule } from '../providers/providers.module';

dotenv.config();

const url = process.env.REDIS_URL!;
const parsed = new URL(url);

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: parsed.hostname,
        port: parseInt(parsed.port),
        username: parsed.username || 'default',
        password: parsed.password,
        tls: url.startsWith('rediss://') ? {} : undefined,
        maxRetriesPerRequest: null,
      },
    }),
    BullModule.registerQueue({
      name: COMPLETION_QUEUE,
    }),
    ProvidersModule,
    UsageModule,
  ],
  providers: [CompletionWorker],
  exports: [BullModule],
})
export class QueueModule {}
