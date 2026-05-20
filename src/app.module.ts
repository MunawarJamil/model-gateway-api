import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import envConfig from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { getRedisClient } from './config/redis';
import { AuthModule } from './modules/auth/auth.module';
import { KeysModule } from './modules/keys/keys.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    PrismaModule,
    AuthModule,
    KeysModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('redisUrl') ?? '';
    getRedisClient(redisUrl);
  }
}
