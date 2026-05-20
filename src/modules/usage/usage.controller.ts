import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { UsageService } from './usage.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@Controller('v1/usage')
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  async getUsage(@Req() req: Request) {
    const apiKey = (req as any).apiKey;
    return this.usageService.getUsage(apiKey.id);
  }
}
