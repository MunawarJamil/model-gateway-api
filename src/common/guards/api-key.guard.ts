import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { KeysService } from '../../modules/keys/keys.service';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private keysService: KeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('API key missing');
    }

    const rawKey = authHeader.split(' ')[1];

    const apiKey = await this.keysService.validateKey(rawKey);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    // downstream controllers mein available hoga
    (request as any).userId = apiKey.userId;
    (request as any).apiKey = apiKey;

    return true;
  }
}
