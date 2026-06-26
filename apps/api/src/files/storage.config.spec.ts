import { ConfigService } from '@nestjs/config';
import { getStorageConfig } from './storage.config';

describe('getStorageConfig', () => {
  const storageEnvironment = {
    S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com/',
    S3_REGION: 'auto',
    S3_BUCKET: 'limitwear-dev',
    S3_ACCESS_KEY_ID: 'access-key',
    S3_SECRET_ACCESS_KEY: 'secret-key',
  };

  it('builds a Cloudflare R2-compatible configuration', () => {
    const config = getStorageConfig(new ConfigService(storageEnvironment));

    expect(config).toEqual({
      endpoint: 'https://account.r2.cloudflarestorage.com',
      region: 'auto',
      bucket: 'limitwear-dev',
      accessKeyId: 'access-key',
      secretAccessKey: 'secret-key',
      publicBaseUrl: undefined,
      signedUrlExpiresIn: 900,
    });
  });

  it('uses the configured CDN and signed URL expiration', () => {
    const config = getStorageConfig(
      new ConfigService({
        ...storageEnvironment,
        S3_PUBLIC_BASE_URL: 'https://cdn.limitwear.com/',
        S3_SIGNED_URL_EXPIRES_IN_SECONDS: '3600',
      }),
    );

    expect(config.publicBaseUrl).toBe('https://cdn.limitwear.com');
    expect(config.signedUrlExpiresIn).toBe(3600);
  });

  it('fails clearly when required storage credentials are missing', () => {
    expect(() => getStorageConfig(new ConfigService())).toThrow(
      'Storage is not configured. Set S3_ENDPOINT',
    );
  });
});
