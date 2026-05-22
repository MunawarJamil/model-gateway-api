// day 7: Webhook CRUD + dead-letter querying.
// Secret is generated here and returned ONCE on register; subsequent reads mask it.

import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterWebhookDto } from './dto/register-webhook.dto';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  // 32-byte hex secret, used to HMAC-sign every delivery payload.
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async register(apiKeyId: string, dto: RegisterWebhookDto) {
    const secret = this.generateSecret();

    const endpoint = await this.prisma.webhookEndpoint.create({
      data: { apiKeyId, url: dto.url, secret },
    });

    // Raw secret returned exactly once — client must store it now.
    return {
      id: endpoint.id,
      url: endpoint.url,
      secret,
      isActive: endpoint.isActive,
      createdAt: endpoint.createdAt,
    };
  }

  async findAll(apiKeyId: string) {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { apiKeyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return endpoints.map((e) => ({
      id: e.id,
      url: e.url,
      isActive: e.isActive,
      createdAt: e.createdAt,
    }));
  }

  async revoke(apiKeyId: string, endpointId: string) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: { id: endpointId, apiKeyId },
    });

    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found');
    }

    await this.prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: { isActive: false },
    });

    return { message: 'Webhook endpoint revoked' };
  }

  // Dead-letter list scoped to the caller's API key.
  async listFailed(apiKeyId: string) {
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: 'dead_letter',
        webhookEndpoint: { apiKeyId },
      },
      include: { webhookEndpoint: { select: { url: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return deliveries.map((d) => ({
      id: d.id,
      url: d.webhookEndpoint.url,
      event: d.event,
      bullJobId: d.bullJobId,
      attemptCount: d.attemptCount,
      lastStatusCode: d.statusCode,
      lastError: d.errorMessage,
      createdAt: d.createdAt,
    }));
  }
}
