import { ConfigService } from '@nestjs/config';

export function getDatabaseUrl(configService: ConfigService): string {
  const databaseUrl =
    configService.get<string>('DATABASE_URL') ?? configService.get<string>('MONGO_URI');

  if (!databaseUrl) {
    throw new Error('MongoDB connection string is missing. Set DATABASE_URL in the environment.');
  }

  return databaseUrl;
}
