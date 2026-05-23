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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from '../completions/dto/create-template.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@ApiTags('Templates')
@ApiSecurity('API-Key')
@Controller('templates')
@UseGuards(ApiKeyGuard, RateLimitGuard)
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a prompt template with {{variable}} placeholders',
  })
  @ApiResponse({ status: 201, description: 'Template created' })
  async create(@Body() dto: CreateTemplateDto, @Req() req: Request) {
    const userId = (req as any).userId;
    return this.templates.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all templates for current API key' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async findAll(@Req() req: Request) {
    const userId = (req as any).userId;
    return this.templates.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template found' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).userId;
    return this.templates.findOne(userId, id);
  }
}
