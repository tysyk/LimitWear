import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, UserStatus } from '@limitwear/shared';
import { OwnershipOptions } from '../decorators/require-ownership.decorator';
import { OwnerGuard } from './owner.guard';

describe('OwnerGuard', () => {
  const createExecutionContext = ({
    options,
    userId = 'user-id',
    role = UserRole.User,
    params = {},
    body = {},
    query = {},
    attachUser = true,
  }: {
    options?: Required<OwnershipOptions>;
    userId?: string;
    role?: UserRole;
    params?: Record<string, unknown>;
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    attachUser?: boolean;
  } = {}) =>
    ({
      getClass: () => class TestController {},
      getHandler: () => function testHandler() {},
      switchToHttp: () => ({
        getRequest: () => ({
          params,
          body,
          query,
          user: attachUser
            ? {
                id: userId,
                email: 'user@example.com',
                role,
                permissions: [],
                status: UserStatus.Active,
                isEmailVerified: false,
                isPhoneVerified: false,
              }
            : undefined,
        }),
      }),
      options,
    }) as unknown as ExecutionContext;

  let guard: OwnerGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new OwnerGuard(reflector as unknown as Reflector);
  });

  it('allows routes without ownership metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createExecutionContext())).toBe(true);
  });

  it('allows when params owner id matches the authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue({
      source: 'params',
      key: 'userId',
      allowAdmin: true,
    });

    expect(
      guard.canActivate(
        createExecutionContext({
          params: {
            userId: 'user-id',
          },
        }),
      ),
    ).toBe(true);
  });

  it('allows nested body ownership values', () => {
    reflector.getAllAndOverride.mockReturnValue({
      source: 'body',
      key: 'owner.id',
      allowAdmin: true,
    });

    expect(
      guard.canActivate(
        createExecutionContext({
          body: {
            owner: {
              id: 'user-id',
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it('allows admins when admin bypass is enabled', () => {
    reflector.getAllAndOverride.mockReturnValue({
      source: 'params',
      key: 'userId',
      allowAdmin: true,
    });

    expect(
      guard.canActivate(
        createExecutionContext({
          role: UserRole.Admin,
          params: {
            userId: 'another-user-id',
          },
        }),
      ),
    ).toBe(true);
  });

  it('blocks when the owner id does not match the authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue({
      source: 'params',
      key: 'userId',
      allowAdmin: true,
    });

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          params: {
            userId: 'another-user-id',
          },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('blocks when AuthGuard has not attached a user', () => {
    reflector.getAllAndOverride.mockReturnValue({
      source: 'params',
      key: 'userId',
      allowAdmin: true,
    });

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          params: {
            userId: 'user-id',
          },
          attachUser: false,
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
