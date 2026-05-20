import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../config/redis';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Private Helpers ───────────────────────────────────────────────

  private monthlyKey(apiKeyId: string): string {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `monthly:tokens:${apiKeyId}:${month}`;
  }

  private async getMonthlyTokensUsed(apiKeyId: string): Promise<number> {
    const key = this.monthlyKey(apiKeyId);

    try {
      // check Redis cache first
      const cached = await this.redis.client.get(key);
      if (cached !== null) return parseInt(cached, 10);

      // if not in cache, fetch from DB
      const now = new Date();
      const record = await this.prisma.usageRecord.findUnique({
        where: {
          apiKeyId_year_month: {
            apiKeyId,
            year: now.getFullYear(),
            month: now.getMonth() + 1,
          },
        },
      });

      const total = record?.totalTokens ?? 0;

      // cache the value in Redis for 1 hour to speed up subsequent checks
      await this.redis.client.set(key, total, 'EX', 3600);

      return total;
    } catch (err) {
      // if redis fails, log the error but don't block the request — fallback to DB
      this.logger.warn(
        `Redis error in getMonthlyTokensUsed: ${(err as Error).message}`,
      );

      const now = new Date();
      const record = await this.prisma.usageRecord.findUnique({
        where: {
          apiKeyId_year_month: {
            apiKeyId,
            year: now.getFullYear(),
            month: now.getMonth() + 1,
          },
        },
      });

      return record?.totalTokens ?? 0;
    }
  }

  // ─── Public Methods ─────────────────────────────────────────────────

  async checkMonthlyLimit(
    apiKeyId: string,
    monthlyTokenLimit: number,
  ): Promise<void> {
    const used = await this.getMonthlyTokensUsed(apiKeyId);

    if (used >= monthlyTokenLimit) {
      throw new HttpException(
        {
          statusCode: 429,
          error: 'MONTHLY_LIMIT_EXCEEDED',
          message: 'Monthly token limit exceeded',
          used,
          limit: monthlyTokenLimit,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async logRequest(data: {
    apiKeyId: string;
    provider: string;
    model: string;
    prompt: string;
    response: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
    type: string;
    status: string;
  }): Promise<void> {
    const totalTokens = data.promptTokens + data.completionTokens;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      // use transaction to ensure both AI request log and usage record update happen together
      await this.prisma.$transaction([
        this.prisma.aiRequest.create({
          data: {
            apiKeyId: data.apiKeyId,
            provider: data.provider,
            model: data.model,
            prompt: data.prompt,
            response: data.response,
            promptTokens: data.promptTokens,
            completionTokens: data.completionTokens,
            latencyMs: data.latencyMs,
            type: data.type,
            status: data.status,
          },
        }),
        this.prisma.usageRecord.upsert({
          where: {
            apiKeyId_year_month: { apiKeyId: data.apiKeyId, year, month },
          },
          update: {
            totalRequests: { increment: 1 },
            totalTokens: { increment: totalTokens },
          },
          create: {
            apiKeyId: data.apiKeyId,
            year,
            month,
            totalRequests: 1,
            totalTokens,
          },
        }),
      ]);

      // update Redis cache for monthly tokens used — so that getMonthlyTokensUsed can return fast for subsequent requests in the same month
      const key = this.monthlyKey(data.apiKeyId);
      try {
        await this.redis.client.incrby(key, totalTokens);
      } catch (redisErr) {
        // only log the error — don't block the request if Redis update fails, since the DB is the source of truth
        this.logger.warn(
          `Redis cache update failed: ${(redisErr as Error).message}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to log AI request: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException('Failed to log request');
    }
  }

  async getUsage(apiKeyId: string) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Dono queries parallel chalao — faster
      const [monthly, dailyRequests] = await Promise.all([
        this.prisma.usageRecord.findUnique({
          where: { apiKeyId_year_month: { apiKeyId, year, month } },
        }),
        this.prisma.aiRequest.aggregate({
          where: {
            apiKeyId,
            createdAt: { gte: todayStart },
          },
          _sum: {
            promptTokens: true,
            completionTokens: true,
          },
          _count: true,
        }),
      ]);

      return {
        daily: {
          requests: dailyRequests._count,
          promptTokens: dailyRequests._sum.promptTokens ?? 0,
          completionTokens: dailyRequests._sum.completionTokens ?? 0,
          totalTokens:
            (dailyRequests._sum.promptTokens ?? 0) +
            (dailyRequests._sum.completionTokens ?? 0),
        },
        monthly: {
          requests: monthly?.totalRequests ?? 0,
          totalTokens: monthly?.totalTokens ?? 0,
        },
      };
    } catch (err) {
      this.logger.error(
        `Failed to fetch usage: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw new InternalServerErrorException('Failed to fetch usage');
    }
  }
}
