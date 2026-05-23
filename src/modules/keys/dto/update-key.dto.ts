import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateKeyDto {
  @ApiPropertyOptional({ example: 'Updated Key Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  requestsPerMin?: number;

  @ApiPropertyOptional({ example: 200000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  monthlyTokenLimit?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
