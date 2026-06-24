import { ConfigService } from '@nestjs/config';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEFAULT_CLIENT_URL = 'http://localhost:3000';
const LOCAL_DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://[::1]:3000',
];

export function createCorsOptions(configService: ConfigService): CorsOptions {
  const allowedOrigins = getAllowedOrigins(configService);

  return {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins === true || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  };
}

export function getAllowedOrigins(configService: ConfigService): string[] | true {
  const rawOrigins =
    configService.get<string>('CORS_ORIGINS') ??
    configService.get<string>('CLIENT_URL') ??
    DEFAULT_CLIENT_URL;
  const nodeEnv = configService.get<string>('NODE_ENV');

  if (rawOrigins.trim() === '*') {
    return true;
  }

  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const configuredOrigins = origins.length > 0 ? origins : [DEFAULT_CLIENT_URL];
  const developmentOrigins = nodeEnv === 'production' ? [] : LOCAL_DEVELOPMENT_ORIGINS;

  return Array.from(new Set([...configuredOrigins, ...developmentOrigins]));
}
