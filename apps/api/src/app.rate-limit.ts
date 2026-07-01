import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

export interface RateLimitConfig {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const DEFAULT_RATE_LIMIT_MAX = 300;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

export function applyRateLimit(app: INestApplication, configService: ConfigService): void {
  const config = getRateLimitConfig(configService);

  if (!config.enabled) {
    return;
  }

  app.use(createRateLimitMiddleware(config));
}

export function getRateLimitConfig(configService: ConfigService): RateLimitConfig {
  return {
    enabled: configService.get<string>('RATE_LIMIT_ENABLED') !== 'false',
    maxRequests: getPositiveInteger(
      configService.get<string>('RATE_LIMIT_MAX'),
      DEFAULT_RATE_LIMIT_MAX,
    ),
    windowMs: getPositiveInteger(
      configService.get<string>('RATE_LIMIT_WINDOW_MS'),
      DEFAULT_RATE_LIMIT_WINDOW_MS,
    ),
  };
}

export function createRateLimitMiddleware(config: RateLimitConfig) {
  const buckets = new Map<string, RateLimitBucket>();

  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    const key = getClientKey(request);
    const currentBucket = buckets.get(key);
    const bucket =
      currentBucket && currentBucket.resetAt > now
        ? currentBucket
        : {
            count: 0,
            resetAt: now + config.windowMs,
          };

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, config.maxRequests - bucket.count);
    response.setHeader('RateLimit-Limit', String(config.maxRequests));
    response.setHeader('RateLimit-Remaining', String(remaining));
    response.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > config.maxRequests) {
      response.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      response.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Try again later.',
      });
      return;
    }

    next();
  };
}

function getClientKey(request: Request): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  const firstForwardedIp =
    typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined;

  return firstForwardedIp || request.ip || request.socket.remoteAddress || 'unknown';
}

function getPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
