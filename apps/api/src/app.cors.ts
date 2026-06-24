import { ConfigService } from '@nestjs/config';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEFAULT_CLIENT_URL = 'http://localhost:3000';

export function createCorsOptions(configService: ConfigService): CorsOptions {
  return {
    credentials: true,
    origin: getAllowedOrigins(configService),
  };
}

function getAllowedOrigins(configService: ConfigService): string[] | true {
  const rawOrigins =
    configService.get<string>('CORS_ORIGINS') ??
    configService.get<string>('CLIENT_URL') ??
    DEFAULT_CLIENT_URL;

  if (rawOrigins.trim() === '*') {
    return true;
  }

  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  return origins.length > 0 ? origins : [DEFAULT_CLIENT_URL];
}
