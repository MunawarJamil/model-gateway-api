import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateKeyDto {
  @ApiProperty({ example: 'My Production Key' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: 60,
    description: 'Requests per minute limit',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  requestsPerMin?: number;

  @ApiPropertyOptional({ example: 100000, description: 'Monthly token limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  monthlyTokenLimit?: number;
}
