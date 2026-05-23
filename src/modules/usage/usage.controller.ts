import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { UsageService } from './usage.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@ApiTags('Usage')
@ApiSecurity('API-Key')
@Controller('usage')
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @ApiOperation({ summary: 'Get token usage — daily and monthly breakdown' })
  @ApiResponse({
    status: 200,
    description: 'Daily and monthly token consumption',
  })
  async getUsage(@Req() req: Request) {
    const apiKey = (req as any).apiKey;
    return this.usageService.getUsage(apiKey.id);
  }
}
