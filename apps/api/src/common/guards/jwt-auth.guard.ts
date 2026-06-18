import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Role } from '../enums/role.enum';

type AuthenticatedRequest = {
  headers: {
    authorization?: string;
  };
  user?: {
    id: string;
    email: string;
    role: Role;
    tokenType: 'mock';
  };
};

const mockUsersByToken: Record<
  string,
  { id: string; email: string; role: Role; tokenType: 'mock' }
> = {
  'demo-admin': {
    id: 'user-admin',
    email: 'admin@demo.local',
    role: Role.Admin,
    tokenType: 'mock',
  },
  'demo-organizer': {
    id: 'user-organizer',
    email: 'organizer@demo.local',
    role: Role.Organizer,
    tokenType: 'mock',
  },
  'demo-viewer': {
    id: 'user-viewer',
    email: 'viewer@demo.local',
    role: Role.Viewer,
    tokenType: 'mock',
  },
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing bearer token. Use a mock token like demo-admin for this scaffold.',
      );
    }

    const token = authorization.slice('Bearer '.length).trim();
    const user = mockUsersByToken[token];

    if (!user) {
      throw new UnauthorizedException('Invalid mock token for demo environment.');
    }

    request.user = user;
    return true;
  }
}
