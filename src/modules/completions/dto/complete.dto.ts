import {
  IsString,
  IsOptional,
  IsIn,
  IsObject,
  IsNotEmpty,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteDto {
  @ApiPropertyOptional({ example: 'Explain quantum computing in simple terms' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  prompt?: string;

  @ApiPropertyOptional({ example: 'clx1234abcd' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  templateId?: string;

  @ApiPropertyOptional({ example: { name: 'Nike', topic: 'marketing' } })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  @ApiPropertyOptional({ example: 'groq', enum: ['gemini', 'groq'] })
  @IsOptional()
  @IsIn(['gemini', 'groq'])
  provider?: string;

  @ApiPropertyOptional({ example: 'llama-3.1-8b-instant' })
  @IsOptional()
  @IsString()
  model?: string;
}
