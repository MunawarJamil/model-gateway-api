import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CompletionsService } from './completions.service';
import { CompleteDto } from './dto/complete.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@Controller()
// Guards run in order: authenticate the API key first, then rate-limit it.
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class CompletionsController {
  constructor(private readonly completions: CompletionsService) {}

  @Post('complete')
  async complete(@Body() dto: CompleteDto, @Req() req: Request) {
    // ApiKeyGuard attaches the authenticated API key to the request.
    const apiKey = (req as any).apiKey;

    return this.completions.complete(dto, apiKey, apiKey.userId);
  }
}
