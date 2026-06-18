import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PasswordService } from '../crypto/password.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthenticatedUser, TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async login(payload: LoginDto) {
    const user = await this.usersService.findByEmail(payload.email);

    if (
      !user ||
      !user.passwordHash ||
      !user.active ||
      !this.passwordService.verify(payload.password, user.passwordHash)
    ) {
      throw new UnauthorizedException('Credenciales no validas.');
    }

    return this.buildSession(user);
  }

  async refresh(payload: RefreshTokenDto) {
    const sessionUser = this.tokenService.verifyRefreshToken(payload.refreshToken);
    const user = await this.usersService.findById(sessionUser.id);

    if (!user || !user.active) {
      throw new UnauthorizedException('El usuario ya no existe.');
    }

    return this.buildSession(user);
  }

  async me(user: AuthenticatedUser) {
    const storedUser = await this.usersService.findById(user.id);

    if (!storedUser || !storedUser.active) {
      throw new UnauthorizedException('Sesion invalida.');
    }

    return storedUser;
  }

  private buildSession(user: {
    id: string;
    email: string;
    fullName: string;
    role: AuthenticatedUser['role'];
  }) {
    const sessionUser = this.toSessionUser(user);

    return {
      accessToken: this.tokenService.signAccessToken(sessionUser),
      refreshToken: this.tokenService.signRefreshToken(sessionUser),
      user: sessionUser,
    };
  }

  private toSessionUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: AuthenticatedUser['role'];
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
