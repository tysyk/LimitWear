import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, UserRole, UserStatus } from '@limitwear/shared';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const createExecutionContext = (user?: { permissions: string[]; role: UserRole }) =>
    ({
      getClass: () => class TestController {},
      getHandler: () => function testHandler() {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: user
            ? {
                id: 'user-id',
                email: 'user@example.com',
                status: UserStatus.Active,
                isEmailVerified: false,
                isPhoneVerified: false,
                ...user,
              }
            : undefined,
        }),
      }),
    }) as unknown as ExecutionContext;

  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  it('allows routes without required permissions', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createExecutionContext())).toBe(true);
  });

  it('allows admins with default admin permissions', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.AdminUsersRead]);

    expect(
      guard.canActivate(
        createExecutionContext({
          role: UserRole.Admin,
          permissions: [],
        }),
      ),
    ).toBe(true);
  });

  it('allows users with explicit extra permissions', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.AdminUsersRead]);

    expect(
      guard.canActivate(
        createExecutionContext({
          role: UserRole.User,
          permissions: [Permission.AdminUsersRead],
        }),
      ),
    ).toBe(true);
  });

  it('blocks users without required permission', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.AdminUsersRead]);

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          role: UserRole.User,
          permissions: [],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('blocks non-designers from designer analytics by default', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.DesignerAnalyticsRead]);

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          role: UserRole.User,
          permissions: [],
        }),
      ),
    ).toThrow(ForbiddenException);

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          role: UserRole.Admin,
          permissions: [],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('blocks when only one of multiple required permissions is present', () => {
    reflector.getAllAndOverride.mockReturnValue([
      Permission.AdminUsersRead,
      Permission.AdminUsersUpdate,
    ]);

    expect(() =>
      guard.canActivate(
        createExecutionContext({
          role: UserRole.User,
          permissions: [Permission.AdminUsersRead],
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('blocks when AuthGuard has not attached a user', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.AdminUsersRead]);

    expect(() => guard.canActivate(createExecutionContext())).toThrow(ForbiddenException);
  });
});
