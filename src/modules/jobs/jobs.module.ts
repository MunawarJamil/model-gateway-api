import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { QueueModule } from '../queue/queue.module';
import { KeysModule } from '../keys/keys.module';

@Module({
  imports: [QueueModule, KeysModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
