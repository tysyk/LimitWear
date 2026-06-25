import { SetMetadata } from '@nestjs/common';

export const OWNERSHIP_OPTIONS_KEY = 'ownership_options';

export type OwnershipSource = 'params' | 'body' | 'query';

export interface OwnershipOptions {
  source?: OwnershipSource;
  key?: string;
  allowAdmin?: boolean;
}

export const RequireOwnership = (options: OwnershipOptions = {}) =>
  SetMetadata(OWNERSHIP_OPTIONS_KEY, {
    source: 'params',
    key: 'userId',
    allowAdmin: true,
    ...options,
  } satisfies Required<OwnershipOptions>);
