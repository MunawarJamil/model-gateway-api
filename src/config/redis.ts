import { Module, Injectable, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(url: string): Redis {
  if (!redisClient) {
    redisClient = new Redis(url);

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });
  }

  return redisClient;
}

@Injectable()
export class RedisService {
  public readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = getRedisClient(this.config.get<string>('REDIS_URL')!);
  }
}

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}