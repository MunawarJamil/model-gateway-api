import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateKeyDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  requestsPerMin?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  monthlyTokenLimit?: number;
}
