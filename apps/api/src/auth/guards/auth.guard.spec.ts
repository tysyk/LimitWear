import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@limitwear/shared';
import { UsersService } from '../../users/users.service';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const createExecutionContext = (cookie?: string) => {
    const request = {
      headers: {
        cookie,
      },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;

    return { context, request };
  };

  let guard: AuthGuard;
  let jwtService: jest.Mocked<Pick<JwtService, 'verifyAsync'>>;
  let usersService: jest.Mocked<Pick<UsersService, 'findById'>>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-id' }),
    };
    usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.User,
        permissions: [],
        status: UserStatus.Active,
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: false,
        isPhoneVerified: false,
      }),
    };

    guard = new AuthGuard(
      jwtService as unknown as JwtService,
      usersService as unknown as UsersService,
    );
  });

  it('attaches the authenticated user from the session cookie', async () => {
    const { context, request } = createExecutionContext('limitwear_session=session-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('session-token');
    expect(usersService.findById).toHaveBeenCalledWith('user-id');
    expect(request).toHaveProperty('user', {
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: false,
      isPhoneVerified: false,
    });
  });

  it('rejects requests without the session cookie', async () => {
    const { context } = createExecutionContext();

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('rejects invalid session tokens', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));
    const { context } = createExecutionContext('limitwear_session=invalid-token');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('rejects inactive users', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Blocked,
      isEmailVerified: false,
      isPhoneVerified: false,
    });
    const { context } = createExecutionContext('limitwear_session=session-token');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
