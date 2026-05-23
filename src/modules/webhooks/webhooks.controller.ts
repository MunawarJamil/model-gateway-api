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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { RegisterWebhookDto } from './dto/register-webhook.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@ApiTags('Webhooks')
@ApiSecurity('API-Key')
@Controller('webhooks')
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a webhook URL — secret returned only once',
  })
  @ApiResponse({
    status: 201,
    description: 'Webhook registered, secret shown once',
  })
  async register(@Body() dto: RegisterWebhookDto, @Req() req: Request) {
    const apiKey = (req as any).apiKey;
    const data = await this.webhooks.register(apiKey.id, dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'List all active webhook endpoints' })
  @ApiResponse({ status: 200, description: 'List of registered webhooks' })
  async findAll(@Req() req: Request) {
    const apiKey = (req as any).apiKey;
    const data = await this.webhooks.findAll(apiKey.id);
    return { success: true, data };
  }

  @Get('failed')
  @ApiOperation({ summary: 'List failed webhook deliveries (dead-letter)' })
  @ApiResponse({ status: 200, description: 'List of failed deliveries' })
  async failed(@Req() req: Request) {
    const apiKey = (req as any).apiKey;
    const data = await this.webhooks.listFailed(apiKey.id);
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a webhook endpoint' })
  @ApiParam({ name: 'id', description: 'Webhook ID to revoke' })
  @ApiResponse({ status: 200, description: 'Webhook revoked' })
  @ApiResponse({ status: 404, description: 'Webhook not found' })
  async revoke(@Param('id') id: string, @Req() req: Request) {
    const apiKey = (req as any).apiKey;
    const data = await this.webhooks.revoke(apiKey.id, id);
    return { success: true, data };
  }
}
