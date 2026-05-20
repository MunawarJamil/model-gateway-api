import { Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { KeysModule } from '../keys/keys.module';
import { KeysService } from '../keys/keys.service';

@Module({
  imports: [RateLimitModule, KeysModule],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
