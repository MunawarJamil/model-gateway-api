import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import envConfig from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { getRedisClient, RedisModule } from './config/redis';
import { AuthModule } from './modules/auth/auth.module';
import { KeysModule } from './modules/keys/keys.module';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';
import { UsageModule } from './modules/usage/usage.module';
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
  ],
  controllers: [], // no controllers in the AppModule, they are defined in their respective modules

  providers: [],
})
export class AppModule implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('redisUrl') ?? '';
    getRedisClient(redisUrl);
  }
}
