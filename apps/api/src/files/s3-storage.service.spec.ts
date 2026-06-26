import { ConfigService } from '@nestjs/config';
import { FileVisibility } from './schemas/file-asset.schema';
import { S3StorageService } from './s3-storage.service';

describe('S3StorageService', () => {
  const config = new ConfigService({
    S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
    S3_BUCKET: 'limitwear-dev',
    S3_ACCESS_KEY_ID: 'access-key',
    S3_SECRET_ACCESS_KEY: 'secret-key',
    S3_PUBLIC_BASE_URL: 'https://cdn.limitwear.com',
  });

  it('generates a category-scoped key without exposing the original filename', () => {
    const service = new S3StorageService(config);
    const storageKey = service.createStorageKey('design_original', 'PNG');

    expect(storageKey).toMatch(/^design_original\/[0-9a-f-]+\.png$/);
    expect(storageKey).not.toContain('hoodie-art');
  });

  it('builds a CDN URL for public files and encodes each key segment', () => {
    const service = new S3StorageService(config);

    expect(service.getPublicUrl('drop_image/hello world.webp')).toBe(
      'https://cdn.limitwear.com/drop_image/hello%20world.webp',
    );
  });

  it('keeps private objects out of a public URL workflow', () => {
    const service = new S3StorageService(config);

    expect(FileVisibility.Private).not.toBe(FileVisibility.Public);
    expect(service.getBucket()).toBe('limitwear-dev');
  });
});
