import { ConfigService } from '@nestjs/config';
import { getDatabaseUrl } from './database.config';

describe('getDatabaseUrl', () => {
  it('prefers DATABASE_URL', () => {
    const configService = new ConfigService({
      DATABASE_URL: 'mongodb://database-url',
      MONGO_URI: 'mongodb://legacy-uri',
    });

    expect(getDatabaseUrl(configService)).toBe('mongodb://database-url');
  });

  it('supports the legacy MONGO_URI variable', () => {
    const configService = new ConfigService({
      MONGO_URI: 'mongodb://legacy-uri',
    });

    expect(getDatabaseUrl(configService)).toBe('mongodb://legacy-uri');
  });

  it('throws a clear error when the connection string is missing', () => {
    const configService = new ConfigService();

    expect(() => getDatabaseUrl(configService)).toThrow('MongoDB connection string is missing');
  });
});
