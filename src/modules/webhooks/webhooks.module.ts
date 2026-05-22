// day 7: Owns webhook CRUD endpoints + exports the dispatcher used by the
// completion worker. Dispatcher stays empty until Step 4.

import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { KeysModule } from '../keys/keys.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
// day 7: QueueModule re-exports BullModule so @InjectQueue(WEBHOOK_QUEUE) resolves here.
// forwardRef because QueueModule's CompletionWorker also imports the dispatcher from here.
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    PrismaModule,
    KeysModule, // ApiKeyGuard
    RateLimitModule, // RateLimitGuard
    forwardRef(() => QueueModule), // BullMQ queue for outbound deliveries
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookDispatcherService],
  exports: [WebhookDispatcherService],
})
export class WebhooksModule {}
