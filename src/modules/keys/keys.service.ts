import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateKeyDto } from './dto/create-key.dto';
import * as crypto from 'crypto';

@Injectable()
export class KeysService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private generateKey(): { raw: string; hash: string; prefix: string } {
    const rawKey = `gw_live_${crypto.randomBytes(32).toString('hex')}`;
    const secret = this.configService.get<string>('hmacSecret')!;
    const hash = crypto
      .createHmac('sha256', secret)
      .update(rawKey)
      .digest('hex');
    const prefix = rawKey.substring(0, 14);
    return { raw: rawKey, hash, prefix };
  }

  async create(userId: string, dto: CreateKeyDto) {
    const { raw, hash, prefix } = this.generateKey();

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        keyHash: hash,
        prefix,
        name: dto.name,
        requestsPerMin: dto.requestsPerMin ?? 60,
        monthlyTokenLimit: dto.monthlyTokenLimit ?? 100000,
      },
    });

    // raw key sirf ek baar return hoti hai — DB mein sirf hash hai
    return {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      key: raw, // ← sirf yahan, kabhi dobara nahi
      requestsPerMin: apiKey.requestsPerMin,
      monthlyTokenLimit: apiKey.monthlyTokenLimit,
      createdAt: apiKey.createdAt,
    };
  }

  async findAll(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // raw key kabhi return nahi hoti — sirf prefix dikhate hain
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      maskedKey: `${key.prefix}${'*'.repeat(20)}`,
      isActive: key.isActive,
      requestsPerMin: key.requestsPerMin,
      monthlyTokenLimit: key.monthlyTokenLimit,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
    }));
  }

  async revoke(userId: string, keyId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    return { message: 'API key revoked successfully' };
  }

  async validateKey(rawKey: string) {
    const secret = this.configService.get<string>('hmacSecret')!;
    const hash = crypto
      .createHmac('sha256', secret)
      .update(rawKey)
      .digest('hex');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: { user: true },
    });

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    // lastUsedAt update karo
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey;
  }
}
