import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './token.service';

type RequestWithUser = {
  user: AuthenticatedUser;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @RateLimit('auth.login', 5, 60)
  @Post('login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Public()
  @RateLimit('auth.refresh', 10, 60)
  @Post('refresh')
  refresh(@Body() payload: RefreshTokenDto) {
    return this.authService.refresh(payload);
  }

  @Get('me')
  me(@Req() request: RequestWithUser) {
    return this.authService.me(request.user);
  }
}
