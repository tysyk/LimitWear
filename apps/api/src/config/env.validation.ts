type Environment = Record<string, string | undefined>;

const PRODUCTION_REQUIRED_KEYS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'CLIENT_URL',
  'CORS_ORIGINS',
  'MONO_TOKEN',
  'MONO_WEBHOOK_URL',
  'MONO_WEBHOOK_SECRET',
  'NOVA_POSHTA_API_KEY',
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_PUBLIC_BASE_URL',
] as const;

const OPTIONAL_URL_KEYS = [
  'CLIENT_URL',
  'MONO_WEBHOOK_URL',
  'MONO_API_BASE_URL',
  'NOVA_POSHTA_API_URL',
  'S3_ENDPOINT',
  'S3_PUBLIC_BASE_URL',
] as const;

export function validateEnv(config: Environment): Environment {
  const nodeEnv = normalizeNodeEnv(config.NODE_ENV);
  const errors: string[] = [];

  if (config.DATABASE_URL && config.MONGO_URI) {
    errors.push('Use DATABASE_URL instead of configuring both DATABASE_URL and MONGO_URI.');
  }

  validateOptionalUrls(config, errors);
  validateSignedUrlExpiry(config, errors);
  validatePositiveInteger(config, 'RATE_LIMIT_MAX', errors);
  validatePositiveInteger(config, 'RATE_LIMIT_WINDOW_MS', errors);

  if (nodeEnv === 'production') {
    validateProductionEnv(config, errors);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid API environment configuration: ${errors.join(' ')}`);
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
  };
}

function validateProductionEnv(config: Environment, errors: string[]) {
  for (const key of PRODUCTION_REQUIRED_KEYS) {
    if (!isRealValue(config[key])) {
      errors.push(`${key} is required in production.`);
    }
  }

  if (!isRealValue(config.DATABASE_URL) && isRealValue(config.MONGO_URI)) {
    errors.push('DATABASE_URL is required in production; MONGO_URI is only a local fallback.');
  }

  if ((config.JWT_SECRET?.trim().length ?? 0) < 32) {
    errors.push('JWT_SECRET must be at least 32 characters in production.');
  }

  if (config.COOKIE_SECURE !== 'true') {
    errors.push('COOKIE_SECURE must be true in production.');
  }

  if (config.CORS_ORIGINS?.trim() === '*') {
    errors.push('CORS_ORIGINS cannot be * in production.');
  }
}

function validateOptionalUrls(config: Environment, errors: string[]) {
  for (const key of OPTIONAL_URL_KEYS) {
    const value = config[key]?.trim();

    if (value && !isPlaceholder(value) && !isValidUrl(value)) {
      errors.push(`${key} must be a valid URL.`);
    }
  }

  const corsOrigins = config.CORS_ORIGINS?.trim();
  if (corsOrigins && corsOrigins !== '*') {
    for (const origin of corsOrigins.split(',')) {
      const value = origin.trim();
      if (value && !isPlaceholder(value) && !isValidUrl(value)) {
        errors.push(`CORS_ORIGINS contains an invalid URL: ${value}.`);
      }
    }
  }
}

function validateSignedUrlExpiry(config: Environment, errors: string[]) {
  const value = config.S3_SIGNED_URL_EXPIRES_IN_SECONDS?.trim();

  if (!value) {
    return;
  }

  const expiresIn = Number(value);
  if (!Number.isInteger(expiresIn) || expiresIn <= 0 || expiresIn > 7 * 24 * 60 * 60) {
    errors.push('S3_SIGNED_URL_EXPIRES_IN_SECONDS must be between 1 and 604800.');
  }
}

function validatePositiveInteger(config: Environment, key: string, errors: string[]) {
  const value = config[key]?.trim();

  if (!value) {
    return;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    errors.push(`${key} must be a positive integer.`);
  }
}

function normalizeNodeEnv(value: string | undefined): string {
  const normalized = value?.trim() || 'development';
  const allowed = new Set(['development', 'test', 'production']);

  if (!allowed.has(normalized)) {
    throw new Error(
      `Invalid API environment configuration: NODE_ENV must be development, test, or production.`,
    );
  }

  return normalized;
}

function isRealValue(value: string | undefined): boolean {
  const normalized = value?.trim();

  return Boolean(normalized && !isPlaceholder(normalized));
}

function isPlaceholder(value: string): boolean {
  return value.startsWith('replace-with-') || value.includes('<') || value.includes('>');
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
