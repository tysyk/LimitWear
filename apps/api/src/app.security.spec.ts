import { ConfigService } from '@nestjs/config';
import { getSecurityHeaders, shouldEnableSwagger } from './app.security';

describe('app security bootstrap helpers', () => {
  const createConfigService = (values: Record<string, string | undefined>) =>
    ({
      get: jest.fn((key: string) => values[key]),
    }) as unknown as ConfigService;

  it('adds baseline browser security headers outside production', () => {
    const headers = getSecurityHeaders(createConfigService({ NODE_ENV: 'development' }));

    expect(headers).toEqual({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    });
  });

  it('adds HSTS in production', () => {
    const headers = getSecurityHeaders(createConfigService({ NODE_ENV: 'production' }));

    expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
  });

  it('keeps Swagger enabled by default outside production', () => {
    expect(shouldEnableSwagger(createConfigService({ NODE_ENV: 'development' }))).toBe(true);
  });

  it('disables Swagger by default in production', () => {
    expect(shouldEnableSwagger(createConfigService({ NODE_ENV: 'production' }))).toBe(false);
  });

  it('allows explicit Swagger override', () => {
    expect(
      shouldEnableSwagger(
        createConfigService({
          NODE_ENV: 'production',
          SWAGGER_ENABLED: 'true',
        }),
      ),
    ).toBe(true);
  });
});
