import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Role } from '../common/enums/role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

type TokenUse = 'access' | 'refresh';

interface TokenPayload {
  sub: string;
  email: string;
  fullName: string;
  role: Role;
  tokenUse: TokenUse;
  iat: number;
  exp: number;
}

interface QrTokenPayload {
  sid: string;
  aid: string;
  act: string;
  tokenUse: 'qr';
  iat: number;
  exp: number;
}

@Injectable()
export class TokenService {
  constructor(private readonly configService: ConfigService) {}

  signAccessToken(user: AuthenticatedUser) {
    return this.signToken(user, 'access', 60 * 15);
  }

  signRefreshToken(user: AuthenticatedUser) {
    return this.signToken(user, 'refresh', 60 * 60 * 24 * 7);
  }

  verifyAccessToken(token: string): AuthenticatedUser {
    return this.verifyToken(token, 'access');
  }

  verifyRefreshToken(token: string): AuthenticatedUser {
    return this.verifyToken(token, 'refresh');
  }

  signQrToken(input: {
    sessionId: string;
    attendeeId: string;
    activityId: string;
    expiresAt: Date;
  }) {
    const payload: QrTokenPayload = {
      sid: input.sessionId,
      aid: input.attendeeId,
      act: input.activityId,
      tokenUse: 'qr',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(input.expiresAt.getTime() / 1000),
    };

    return this.encode(payload, this.getQrSecret());
  }

  verifyQrToken(token: string) {
    const payload = this.decode<QrTokenPayload>(token, this.getQrSecret());

    if (payload.tokenUse !== 'qr') {
      throw new UnauthorizedException('Invalid token type.');
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token expired.');
    }

    return payload;
  }

  private signToken(user: AuthenticatedUser, tokenUse: TokenUse, ttlSeconds: number) {
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tokenUse,
      iat: now,
      exp: now + ttlSeconds,
    };

    return this.encode(payload, this.getSecret(tokenUse));
  }

  private verifyToken(token: string, expectedUse: TokenUse): AuthenticatedUser {
    const payload = this.decode<TokenPayload>(token, this.getSecret(expectedUse));

    if (payload.tokenUse !== expectedUse) {
      throw new UnauthorizedException('Invalid token type.');
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token expired.');
    }

    return {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
    };
  }

  private encode(payload: object, secret: string) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = this.toBase64Url(JSON.stringify(header));
    const encodedPayload = this.toBase64Url(JSON.stringify(payload));
    const signature = this.sign(`${encodedHeader}.${encodedPayload}`, secret);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private decode<T>(token: string, secret: string): T {
    const [encodedHeader, encodedPayload, providedSignature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !providedSignature) {
      throw new UnauthorizedException('Malformed token.');
    }

    const expectedSignature = this.sign(`${encodedHeader}.${encodedPayload}`, secret);

    if (
      providedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedSignature),
      )
    ) {
      throw new UnauthorizedException('Invalid token signature.');
    }

    try {
      return JSON.parse(
        Buffer.from(this.fromBase64Url(encodedPayload), 'base64').toString('utf8'),
      ) as T;
    } catch {
      throw new UnauthorizedException('Invalid token payload.');
    }
  }

  private sign(value: string, secret: string) {
    return createHmac('sha256', secret).update(value).digest('base64url');
  }

  private toBase64Url(value: string) {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private fromBase64Url(value: string) {
    return Buffer.from(value, 'base64url').toString('base64');
  }

  private getSecret(tokenUse: TokenUse) {
    if (tokenUse === 'access') {
      return (
        this.configService.get<string>('JWT_ACCESS_SECRET') ??
        'dev-access-secret-change-me'
      );
    }

    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      'dev-refresh-secret-change-me'
    );
  }

  private getQrSecret() {
    return (
      this.configService.get<string>('QR_SIGNING_SECRET') ??
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'dev-qr-secret-change-me'
    );
  }
}
