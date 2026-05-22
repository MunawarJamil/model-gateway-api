import {
  IsString,
  IsOptional,
  IsIn,
  IsObject,
  IsNotEmpty,
} from 'class-validator';

export class CompleteDto {
  // Direct prompt. Optional because the request may use a template instead.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  prompt?: string;

  // Template-based request: reference a saved template by id.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  templateId?: string;

  // Variables to interpolate into the template (e.g. { name: "Nike" }).
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;

  // Optional provider override. If omitted, the API key's default is used.
  @IsOptional()
  @IsIn(['gemini', 'groq'])
  provider?: string;

  // Optional model override, passed through to the provider.
  @IsOptional()
  @IsString()
  model?: string;
}
