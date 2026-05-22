import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { KeysModule } from '../keys/keys.module';

@Module({
  imports: [
    PrismaModule, // TemplatesService needs PrismaService
    RateLimitModule, // RateLimitGuard needs RateLimitService
    KeysModule, // ApiKeyGuard needs KeysService
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  // Exported so CompletionsModule can reuse template logic later if needed.
  exports: [TemplatesService],
})
export class TemplatesModule {}
