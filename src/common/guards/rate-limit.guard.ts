import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { RateLimitService } from '../../modules/rate-limit/rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest(); // type assertion to access apiKey set by ApiKeyGuard
    const apiKey = request.apiKey; // set by ApiKeyGuard if API key was used, otherwise undefined for JWT requests

    if (!apiKey) return true; // Only apply rate limiting for API key requests, not JWT requests
    const { limited, retryAfter } = await this.rateLimitService.isRateLimited(
      apiKey.id,
      apiKey.requestsPerMin,
    );

    if (limited) {
      throw new HttpException(
        {
          statusCode: 429,
          message: 'Rate limit exceeded',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
        {
          cause: { 'Retry-After': retryAfter },
        },
      );
    }

    return true;
  }
}
