// day 7: HTTP entrypoint for webhook management.
//   POST   /v1/webhooks         register URL (secret returned ONCE)
//   GET    /v1/webhooks         list active endpoints
//   GET    /v1/webhooks/failed  dead-letter deliveries
//   DELETE /v1/webhooks/:id     revoke endpoint

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { RegisterWebhookDto } from './dto/register-webhook.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@Controller('webhooks')
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post()
  async register(@Body() dto: RegisterWebhookDto, @Req() req: Request) {
    const apiKey = (req as any).apiKey;
    const data = await this.webhooks.register(apiKey.id, dto);
    return { success: true, data };
  }

  @Get()
  async findAll(@Req() req: Request) {
    const apiKey = (req as any).apiKey;
    const data = await this.webhooks.findAll(apiKey.id);
    return { success: true, data };
  }

  // Static path before :id so Nest doesn't route /failed into the param handler.
  @Get('failed')
  async failed(@Req() req: Request) {
    const apiKey = (req as any).apiKey;
    const data = await this.webhooks.listFailed(apiKey.id);
    return { success: true, data };
  }

  @Delete(':id')
  async revoke(@Param('id') id: string, @Req() req: Request) {
    const apiKey = (req as any).apiKey;
    const data = await this.webhooks.revoke(apiKey.id, id);
    return { success: true, data };
  }
}
