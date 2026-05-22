import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from '../completions/dto/create-template.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@Controller('templates')
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Post()
  async create(@Body() dto: CreateTemplateDto, @Req() req: Request) {
    const userId = (req as any).userId;
    return this.templates.create(userId, dto);
  }

  @Get()
  async findAll(@Req() req: Request) {
    const userId = (req as any).userId;
    return this.templates.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).userId;
    return this.templates.findOne(userId, id);
  }
}
