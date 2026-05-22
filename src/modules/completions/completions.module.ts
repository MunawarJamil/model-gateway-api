import { Module } from '@nestjs/common';
import { CompletionsController } from './completions.controller';
import { CompletionsService } from './completions.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProvidersModule } from '../providers/providers.module';
import { UsageModule } from '../usage/usage.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { KeysModule } from '../keys/keys.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    PrismaModule,
    ProvidersModule, // gives ProvidersService
    UsageModule, // gives UsageService
    RateLimitModule, // gives RateLimitService (needed by RateLimitGuard)
    KeysModule, // gives KeysService (needed by ApiKeyGuard)
    JobsModule,
  ],
  controllers: [CompletionsController],
  providers: [CompletionsService],
})
export class CompletionsModule {}
