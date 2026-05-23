import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import envConfig from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './config/redis';
import { AuthModule } from './modules/auth/auth.module';
import { KeysModule } from './modules/keys/keys.module';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';
import { UsageModule } from './modules/usage/usage.module';
import { CompletionsModule } from './modules/completions/completions.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { QueueModule } from './modules/queue/queue.module';
// day 7: webhook management + delivery dispatcher
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { HealthController } from './health.controller';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // makes the ConfigService available globally without needing to import ConfigModule in other modules

      load: [envConfig], // same like envConfig()
    }),
    PrismaModule, // PrismaModule should be imported before AuthModule and KeysModule because they depend on it
    AuthModule,
    KeysModule,
    RedisModule,
    RateLimitModule,
    UsageModule,
    CompletionsModule,
    TemplatesModule,
    QueueModule,
    JobsModule,
    WebhooksModule,
  ],
  controllers: [HealthController],

  providers: [],
})
export class AppModule {}
