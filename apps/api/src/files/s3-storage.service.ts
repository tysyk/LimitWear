import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { FileVisibility } from './schemas/file-asset.schema';
import { getStorageConfig, StorageConfig } from './storage.config';

type UploadObjectInput = {
  storageKey: string;
  body: Uint8Array;
  mimeType: string;
  visibility: FileVisibility;
};

@Injectable()
export class S3StorageService {
  constructor(private readonly configService: ConfigService) {}

  async uploadObject(input: UploadObjectInput): Promise<void> {
    const { client, config } = this.getClient();

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: input.storageKey,
        Body: input.body,
        ContentType: input.mimeType,
        CacheControl:
          input.visibility === FileVisibility.Public
            ? 'public, max-age=31536000, immutable'
            : 'private, no-store',
      }),
    );
  }

  async getPrivateUrl(storageKey: string): Promise<string> {
    const { client, config } = this.getClient();

    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: storageKey,
      }),
      { expiresIn: config.signedUrlExpiresIn },
    );
  }

  getPublicUrl(storageKey: string): string {
    const config = getStorageConfig(this.configService);
    const encodedKey = storageKey.split('/').map(encodeURIComponent).join('/');
    const baseUrl = config.publicBaseUrl ?? `${config.endpoint}/${config.bucket}`;

    return `${baseUrl}/${encodedKey}`;
  }

  getBucket(): string {
    return getStorageConfig(this.configService).bucket;
  }

  createStorageKey(category: string, extension: string): string {
    const normalizedCategory = category.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
    const normalizedExtension = extension.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const suffix = normalizedExtension ? `.${normalizedExtension}` : '';

    return `${normalizedCategory}/${randomUUID()}${suffix}`;
  }

  private getClient(): { client: S3Client; config: StorageConfig } {
    const config = getStorageConfig(this.configService);

    return {
      config,
      client: new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      }),
    };
  }
}
