// day 7: POST /v1/webhooks body — only url is client-supplied.
import { IsUrl } from 'class-validator';

export class RegisterWebhookDto {
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url!: string;
}
