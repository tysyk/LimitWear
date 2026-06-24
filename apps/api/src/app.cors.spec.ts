import { ConfigService } from '@nestjs/config';
import { createCorsOptions } from './app.cors';

describe('createCorsOptions', () => {
  const createConfigService = (values: Record<string, string | undefined>) =>
    ({
      get: jest.fn((key: string) => values[key]),
    }) as unknown as ConfigService;

  it('uses comma-separated CORS_ORIGINS with credentials enabled', () => {
    const configService = createConfigService({
      CORS_ORIGINS: ' http://localhost:3000, https://limitwear.example ',
    });

    expect(createCorsOptions(configService)).toEqual({
      credentials: true,
      origin: ['http://localhost:3000', 'https://limitwear.example'],
    });
  });

  it('falls back to CLIENT_URL', () => {
    const configService = createConfigService({
      CLIENT_URL: 'http://localhost:3000',
    });

    expect(createCorsOptions(configService)).toEqual({
      credentials: true,
      origin: ['http://localhost:3000'],
    });
  });

  it('supports wildcard origin by reflecting request origins', () => {
    const configService = createConfigService({
      CORS_ORIGINS: '*',
    });

    expect(createCorsOptions(configService)).toEqual({
      credentials: true,
      origin: true,
    });
  });
});
