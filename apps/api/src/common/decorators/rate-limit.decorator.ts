import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export type RateLimitConfig = {
  bucket: string;
  maxRequests: number;
  windowSeconds: number;
};

export const RateLimit = (
  bucket: string,
  maxRequests: number,
  windowSeconds: number,
): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_KEY, {
    bucket,
    maxRequests,
    windowSeconds,
  } satisfies RateLimitConfig);
