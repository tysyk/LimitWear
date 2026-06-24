import { ConfigService } from '@nestjs/config';
import { createCorsOptions, getAllowedOrigins } from './app.cors';

describe('createCorsOptions', () => {
  const createConfigService = (values: Record<string, string | undefined>) =>
    ({
      get: jest.fn((key: string) => values[key]),
    }) as unknown as ConfigService;

  it('uses comma-separated CORS_ORIGINS with credentials enabled', () => {
    const configService = createConfigService({
      CORS_ORIGINS: ' http://localhost:3000, https://limitwear.example ',
    });

    const options = createCorsOptions(configService);

    expect(options.credentials).toBe(true);
    expect(typeof options.origin).toBe('function');
    expect(getAllowedOrigins(configService)).toEqual([
      'http://localhost:3000',
      'https://limitwear.example',
      'http://127.0.0.1:3000',
      'http://[::1]:3000',
    ]);
  });

  it('falls back to CLIENT_URL', () => {
    const configService = createConfigService({
      CLIENT_URL: 'http://localhost:3000',
    });

    expect(getAllowedOrigins(configService)).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://[::1]:3000',
    ]);
  });

  it('supports wildcard origin by reflecting request origins', () => {
    const configService = createConfigService({
      CORS_ORIGINS: '*',
    });

    expect(getAllowedOrigins(configService)).toBe(true);
  });

  it('does not add development origins in production', () => {
    const configService = createConfigService({
      CORS_ORIGINS: 'https://limitwear.example',
      NODE_ENV: 'production',
    });

    expect(getAllowedOrigins(configService)).toEqual(['https://limitwear.example']);
  });

  it('allows configured origins through the origin callback', () => {
    const configService = createConfigService({
      CORS_ORIGINS: 'https://limitwear.example',
    });
    const options = createCorsOptions(configService);
    const callback = jest.fn();

    if (typeof options.origin !== 'function') {
      throw new Error('Expected CORS origin callback');
    }

    options.origin('http://localhost:3000', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('rejects unknown origins through the origin callback', () => {
    const configService = createConfigService({
      CORS_ORIGINS: 'https://limitwear.example',
    });
    const options = createCorsOptions(configService);
    const callback = jest.fn();

    if (typeof options.origin !== 'function') {
      throw new Error('Expected CORS origin callback');
    }

    options.origin('https://evil.example', callback);

    expect(callback).toHaveBeenCalledWith(null, false);
  });
});
