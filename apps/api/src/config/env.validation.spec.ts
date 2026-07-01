import { validateEnv } from './env.validation';

const validProductionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'mongodb+srv://user:password@cluster.mongodb.net/limitwear',
  JWT_SECRET: 'a-production-secret-that-is-long-enough',
  CLIENT_URL: 'https://limitwear.example',
  CORS_ORIGINS: 'https://limitwear.example,https://www.limitwear.example',
  COOKIE_SECURE: 'true',
  MONO_TOKEN: 'mono-token',
  MONO_WEBHOOK_URL: 'https://api.limitwear.example/webhooks/monobank',
  MONO_WEBHOOK_SECRET: 'mono-webhook-secret',
  NOVA_POSHTA_API_KEY: 'nova-poshta-key',
  S3_ENDPOINT: 'https://storage.example',
  S3_BUCKET: 'limitwear-prod',
  S3_ACCESS_KEY_ID: 'access-key',
  S3_SECRET_ACCESS_KEY: 'secret-key',
  S3_PUBLIC_BASE_URL: 'https://cdn.limitwear.example',
};

describe('validateEnv', () => {
  it('defaults NODE_ENV to development for local configuration', () => {
    expect(validateEnv({})).toEqual({
      NODE_ENV: 'development',
    });
  });

  it('accepts a complete production configuration', () => {
    expect(validateEnv(validProductionEnv)).toEqual(validProductionEnv);
  });

  it('rejects production placeholders and missing secrets', () => {
    expect(() =>
      validateEnv({
        ...validProductionEnv,
        JWT_SECRET: 'replace-with-a-long-random-secret',
        MONO_TOKEN: undefined,
        S3_ENDPOINT: 'https://<account-id>.r2.cloudflarestorage.com',
      }),
    ).toThrow(/JWT_SECRET is required in production.*MONO_TOKEN is required in production/s);
  });

  it('rejects unsafe production security settings', () => {
    expect(() =>
      validateEnv({
        ...validProductionEnv,
        CORS_ORIGINS: '*',
        COOKIE_SECURE: 'false',
        JWT_SECRET: 'short',
      }),
    ).toThrow(
      /JWT_SECRET must be at least 32 characters.*COOKIE_SECURE must be true.*CORS_ORIGINS cannot be \*/s,
    );
  });

  it('rejects invalid URLs and signed URL expiry values', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        CLIENT_URL: 'limitwear.local',
        CORS_ORIGINS: 'http://localhost:3000,not-a-url',
        S3_SIGNED_URL_EXPIRES_IN_SECONDS: '999999999',
      }),
    ).toThrow(/CLIENT_URL must be a valid URL.*CORS_ORIGINS contains an invalid URL/s);
  });

  it('rejects invalid rate limit values', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        RATE_LIMIT_MAX: 'zero',
        RATE_LIMIT_WINDOW_MS: '-1',
      }),
    ).toThrow(/RATE_LIMIT_MAX must be a positive integer.*RATE_LIMIT_WINDOW_MS/s);
  });
});
