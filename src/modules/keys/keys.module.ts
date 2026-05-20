import { Module } from '@nestjs/common';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { JwtGuard } from '../../common/guards/jwt.guard';

@Module({
  controllers: [KeysController],
  providers: [KeysService, ApiKeyGuard, JwtGuard],
})
export class KeysModule {}
