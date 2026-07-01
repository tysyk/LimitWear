import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';

export function applySecurityHeaders(app: INestApplication, configService: ConfigService): void {
  const headers = getSecurityHeaders(configService);

  app.use((_request: Request, response: Response, next: NextFunction) => {
    for (const [key, value] of Object.entries(headers)) {
      response.setHeader(key, value);
    }

    next();
  });
}

export function getSecurityHeaders(configService: ConfigService): Record<string, string> {
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  if (nodeEnv === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }

  return headers;
}

export function shouldEnableSwagger(configService: ConfigService): boolean {
  const explicitValue = configService.get<string>('SWAGGER_ENABLED')?.trim().toLowerCase();

  if (explicitValue) {
    return explicitValue === 'true';
  }

  return configService.get<string>('NODE_ENV') !== 'production';
}
