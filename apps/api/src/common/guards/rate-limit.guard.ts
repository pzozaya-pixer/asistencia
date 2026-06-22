import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RATE_LIMIT_KEY,
  type RateLimitConfig,
} from '../decorators/rate-limit.decorator';

type RequestWithRateMetadata = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requestLog = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config = this.reflector.getAllAndOverride<RateLimitConfig>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithRateMetadata>();
    const clientId = this.resolveClientId(request);
    const key = `${config.bucket}:${clientId}`;
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;
    const recentEntries = (this.requestLog.get(key) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );

    if (recentEntries.length >= config.maxRequests) {
      throw new HttpException(
        `Rate limit exceeded for ${config.bucket}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recentEntries.push(now);
    this.requestLog.set(key, recentEntries);
    this.pruneStaleEntries(windowStart);
    return true;
  }

  private resolveClientId(request: RequestWithRateMetadata) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;

    if (forwardedValue) {
      return forwardedValue.split(',')[0]?.trim() || 'unknown';
    }

    return request.ip ?? request.socket?.remoteAddress ?? 'unknown';
  }

  private pruneStaleEntries(windowStart: number) {
    for (const [key, timestamps] of this.requestLog.entries()) {
      const filtered = timestamps.filter((timestamp) => timestamp > windowStart);

      if (filtered.length === 0) {
        this.requestLog.delete(key);
      } else if (filtered.length !== timestamps.length) {
        this.requestLog.set(key, filtered);
      }
    }
  }
}
