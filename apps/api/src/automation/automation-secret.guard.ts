import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';

type AutomationRequest = {
  headers: {
    'x-automation-secret'?: string | string[];
  };
};

@Injectable()
export class AutomationSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const configuredSecret = this.configService.get<string>('AUTOMATION_SECRET');

    if (!configuredSecret) {
      throw new InternalServerErrorException(
        'Automation secret is not configured.',
      );
    }

    const request = context.switchToHttp().getRequest<AutomationRequest>();
    const receivedHeader = request.headers['x-automation-secret'];
    const receivedSecret = Array.isArray(receivedHeader)
      ? receivedHeader[0]
      : receivedHeader;

    if (!receivedSecret) {
      throw new UnauthorizedException('Missing automation secret.');
    }

    const expectedBuffer = Buffer.from(configuredSecret, 'utf-8');
    const actualBuffer = Buffer.from(receivedSecret, 'utf-8');

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new UnauthorizedException('Invalid automation secret.');
    }

    return true;
  }
}
