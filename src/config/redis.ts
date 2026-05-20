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
