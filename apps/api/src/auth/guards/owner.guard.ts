import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@limitwear/shared';
import { OWNERSHIP_OPTIONS_KEY, OwnershipOptions } from '../decorators/require-ownership.decorator';
import type { AuthenticatedRequest } from '../types/authenticated-request';

interface ObjectIdLike {
  toHexString: () => string;
}

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<Required<OwnershipOptions> | undefined>(
      OWNERSHIP_OPTIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Resource ownership is required');
    }

    if (options.allowAdmin && user.role === UserRole.Admin) {
      return true;
    }

    const ownerValue = this.getValueByPath(
      request[options.source] as Record<string, unknown> | undefined,
      options.key,
    );

    if (!this.matchesUserId(ownerValue, user.id)) {
      throw new ForbiddenException('Resource ownership is required');
    }

    return true;
  }

  private getValueByPath(source: Record<string, unknown> | undefined, key: string): unknown {
    if (!source) {
      return undefined;
    }

    return key.split('.').reduce<unknown>((value, pathPart) => {
      if (typeof value !== 'object' || value === null) {
        return undefined;
      }

      return (value as Record<string, unknown>)[pathPart];
    }, source);
  }

  private matchesUserId(ownerValue: unknown, userId: string): boolean {
    if (Array.isArray(ownerValue)) {
      return ownerValue.some((value) => this.matchesUserId(value, userId));
    }

    if (ownerValue === undefined || ownerValue === null) {
      return false;
    }

    if (typeof ownerValue === 'string' || typeof ownerValue === 'number') {
      return String(ownerValue) === userId;
    }

    if (this.isObjectIdLike(ownerValue)) {
      return ownerValue.toHexString() === userId;
    }

    return false;
  }

  private isObjectIdLike(value: unknown): value is ObjectIdLike {
    return (
      typeof value === 'object' &&
      value !== null &&
      'toHexString' in value &&
      typeof (value as { toHexString?: unknown }).toHexString === 'function'
    );
  }
}
