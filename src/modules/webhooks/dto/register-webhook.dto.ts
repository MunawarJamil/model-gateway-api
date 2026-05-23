import { IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterWebhookDto {
  @ApiProperty({
    example: 'https://myapp.com/webhooks/gateway',
    description: 'HTTPS URL to receive webhook events',
  })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url!: string;
}
