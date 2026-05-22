import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  // A human-friendly name to identify the template.
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  // The template body. May contain {{variable}} placeholders
  // that get interpolated at completion time.
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content!: string;
}