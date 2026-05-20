import { Injectable } from '@nestjs/common';
import { RedisService } from '../../config/redis';

@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async isRateLimited(
    apiKeyId: string,
    limitPerMin: number,
  ): Promise<{ limited: boolean; retryAfter?: number }> {
    const key = `ratelimit:${apiKeyId}`;
    const current = await this.redis.client.incr(key);

    if (current === 1) {
      await this.redis.client.expire(key, 60);
    }

    if (current > limitPerMin) {
      const ttl = await this.redis.client.ttl(key);
      return { limited: true, retryAfter: ttl };
    }

    return { limited: false };
  }
}
