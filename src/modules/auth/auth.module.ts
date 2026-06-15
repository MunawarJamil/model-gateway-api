import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from '../../common/guards/jwt.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtGuard],
})
export class AuthModule {}
