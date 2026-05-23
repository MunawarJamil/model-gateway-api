import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';
import { KeysService } from './keys.service';
import { CreateKeyDto } from './dto/create-key.dto';
import type { Request } from 'express';
import { JwtGuard } from '../../common/guards/jwt.guard';

@ApiTags('Keys')
@ApiSecurity('JWT')
@Controller('keys')
@UseGuards(JwtGuard)
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({
    status: 201,
    description: 'API key created — raw key shown only once',
  })
  async create(@Body() dto: CreateKeyDto, @Req() req: Request) {
    const userId = (req as any).userId;
    const data = await this.keysService.create(userId, dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of API keys (hashed, no raw keys)',
  })
  async findAll(@Req() req: Request) {
    const userId = (req as any).userId;
    const data = await this.keysService.findAll(userId);
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiParam({ name: 'id', description: 'API key ID to revoke' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  @ApiResponse({
    status: 404,
    description: 'Key not found or does not belong to user',
  })
  async revoke(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).userId;
    const data = await this.keysService.revoke(userId, id);
    return { success: true, data };
  }
}
