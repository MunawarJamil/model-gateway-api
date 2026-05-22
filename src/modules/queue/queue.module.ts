import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { COMPLETION_QUEUE } from './queue.constants';
import { CompletionWorker } from './completion.worker';
import * as dotenv from 'dotenv';
import { UsageModule } from '../usage/usage.module';
import { ProvidersModule } from '../providers/providers.module';
// day 7: webhook delivery queue + worker; PrismaModule for delivery row updates.
import { WEBHOOK_QUEUE } from './queue.constants';
import { WebhookWorker } from './webhook.worker';
import { PrismaModule } from '../../prisma/prisma.module';
// day 7: CompletionWorker needs WebhookDispatcherService from WebhooksModule.
// forwardRef because WebhooksModule also imports QueueModule (for the queue).
import { WebhooksModule } from '../webhooks/webhooks.module';

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
    // day 7: outbound webhook deliveries — own queue so retries don't share
    // workers with the completion queue.
    BullModule.registerQueue({
      name: WEBHOOK_QUEUE,
    }),
    ProvidersModule,
    UsageModule,
    PrismaModule,
    forwardRef(() => WebhooksModule),
  ],
  providers: [CompletionWorker, WebhookWorker],
  exports: [BullModule],
})
export class QueueModule {}
