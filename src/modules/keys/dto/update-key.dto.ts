import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class UpdateKeyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  requestsPerMin?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  monthlyTokenLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
