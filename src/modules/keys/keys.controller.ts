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
import { KeysService } from './keys.service';
import { CreateKeyDto } from './dto/create-key.dto';
import type { Request } from 'express';
import { JwtGuard } from '../../common/guards/jwt.guard';

@Controller('keys')
@UseGuards(JwtGuard)
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Post()
  async create(@Body() dto: CreateKeyDto, @Req() req: Request) {
    const userId = (req as any).userId;
    const data = await this.keysService.create(userId, dto);
    return { success: true, data };
  }

  @Get()
  async findAll(@Req() req: Request) {
    const userId = (req as any).userId;
    const data = await this.keysService.findAll(userId);
    return { success: true, data };
  }

  @Delete(':id')
  async revoke(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).userId;
    const data = await this.keysService.revoke(userId, id);
    return { success: true, data };
  }
}
