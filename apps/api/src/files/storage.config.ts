import { ConfigService } from '@nestjs/config';

export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
  signedUrlExpiresIn: number;
};

const DEFAULT_SIGNED_URL_EXPIRES_IN = 15 * 60;

export function getStorageConfig(configService: ConfigService): StorageConfig {
  const endpoint = getRequiredValue(configService, 'S3_ENDPOINT');
  const bucket = getRequiredValue(configService, 'S3_BUCKET');
  const accessKeyId = getRequiredValue(configService, 'S3_ACCESS_KEY_ID');
  const secretAccessKey = getRequiredValue(configService, 'S3_SECRET_ACCESS_KEY');
  const signedUrlExpiresIn = getSignedUrlExpiresIn(configService);
  const publicBaseUrl = configService.get<string>('S3_PUBLIC_BASE_URL')?.trim();

  return {
    endpoint: removeTrailingSlash(endpoint),
    region: configService.get<string>('S3_REGION')?.trim() || 'auto',
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicBaseUrl ? removeTrailingSlash(publicBaseUrl) : undefined,
    signedUrlExpiresIn,
  };
}

function getRequiredValue(configService: ConfigService, key: string): string {
  const value = configService.get<string>(key)?.trim();

  if (!value || value.startsWith('replace-with-') || value.includes('<')) {
    throw new Error(`Storage is not configured. Set ${key} in the environment.`);
  }

  return value;
}

function getSignedUrlExpiresIn(configService: ConfigService): number {
  const value = configService.get<string>('S3_SIGNED_URL_EXPIRES_IN_SECONDS');

  if (!value) {
    return DEFAULT_SIGNED_URL_EXPIRES_IN;
  }

  const expiresIn = Number(value);

  if (!Number.isInteger(expiresIn) || expiresIn <= 0 || expiresIn > 7 * 24 * 60 * 60) {
    throw new Error('S3_SIGNED_URL_EXPIRES_IN_SECONDS must be between 1 and 604800.');
  }

  return expiresIn;
}

function removeTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}
