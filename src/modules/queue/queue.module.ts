import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { COMPLETION_QUEUE } from './queue.constants';
import { CompletionWorker } from './completion.worker';
import { UsageModule } from '../usage/usage.module';
import { ProvidersModule } from '../providers/providers.module';
import { WEBHOOK_QUEUE } from './queue.constants';
import { WebhookWorker } from './webhook.worker';
import { PrismaModule } from '../../prisma/prisma.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL')!;
        const parsed = new URL(url);
        return {
          connection: {
            host: parsed.hostname,
            port: parseInt(parsed.port),
            username: parsed.username || 'default',
            password: parsed.password,
            tls: url.startsWith('rediss://') ? {} : undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: COMPLETION_QUEUE }),
    BullModule.registerQueue({ name: WEBHOOK_QUEUE }),
    ProvidersModule,
    UsageModule,
    PrismaModule,
    forwardRef(() => WebhooksModule),
  ],
  providers: [CompletionWorker, WebhookWorker],
  exports: [BullModule],
})
export class QueueModule {}
