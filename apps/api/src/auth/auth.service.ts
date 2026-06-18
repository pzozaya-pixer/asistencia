import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { MockStoreService, MockUserProfile } from '../store/mock-store.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthenticatedUser, TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly store: MockStoreService,
    private readonly tokenService: TokenService,
  ) {}

  login(payload: LoginDto) {
    const user = this.store.getUserCredentialsByEmail(payload.email);

    if (!user || user.password !== payload.password) {
      throw new UnauthorizedException('Credenciales no validas.');
    }

    return this.buildSession(user);
  }

  refresh(payload: RefreshTokenDto) {
    const sessionUser = this.tokenService.verifyRefreshToken(payload.refreshToken);
    const user = this.store.getUserById(sessionUser.id);

    if (!user) {
      throw new UnauthorizedException('El usuario ya no existe.');
    }

    return this.buildSession(user);
  }

  me(user: AuthenticatedUser) {
    const storedUser = this.store.getUserById(user.id);

    if (!storedUser) {
      throw new UnauthorizedException('Sesion invalida.');
    }

    return storedUser;
  }

  private buildSession(user: MockUserProfile) {
    const sessionUser = this.toSessionUser(user);

    return {
      accessToken: this.tokenService.signAccessToken(sessionUser),
      refreshToken: this.tokenService.signRefreshToken(sessionUser),
      user: sessionUser,
    };
  }

  private toSessionUser(user: MockUserProfile): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as Role,
    };
  }
}
