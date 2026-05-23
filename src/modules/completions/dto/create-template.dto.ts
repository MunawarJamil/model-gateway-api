import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Marketing Email', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'Write a marketing email for {{brand}} about {{topic}}',
    maxLength: 10000,
    description: 'Template body with {{variable}} placeholders',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content!: string;
}
