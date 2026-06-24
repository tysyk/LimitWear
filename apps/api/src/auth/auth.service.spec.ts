import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@limitwear/shared';
import { compare, hash } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      'createUser' | 'findByEmail' | 'findByEmailWithPasswordHash' | 'updateLastLoginAt'
    >
  >;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockReturnValue('development'),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('session-token'),
    };
    usersService = {
      createUser: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailWithPasswordHash: jest.fn(),
      updateLastLoginAt: jest.fn(),
    };

    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('registers a user with normalized email and a hashed password', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.createUser.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      firstName: 'Test',
      lastName: 'User',
      phone: '+380000000000',
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    await expect(
      service.register({
        email: ' USER@Example.COM ',
        password: 'Password1',
        firstName: ' Test ',
        lastName: ' User ',
        phone: ' +380000000000 ',
      }),
    ).resolves.toEqual({
      user: {
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.User,
        permissions: [],
        status: UserStatus.Active,
        firstName: 'Test',
        lastName: 'User',
        phone: '+380000000000',
        isEmailVerified: false,
        isPhoneVerified: false,
      },
    });

    expect(usersService.findByEmail).toHaveBeenCalledWith('user@example.com');
    expect(usersService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+380000000000',
      }),
    );

    const createUserInput = usersService.createUser.mock.calls[0][0];
    expect(createUserInput.passwordHash).not.toBe('Password1');
    await expect(compare('Password1', createUserInput.passwordHash)).resolves.toBe(true);
  });

  it('rejects duplicate emails', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'existing-user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'Password1',
      }),
    ).rejects.toThrow(ConflictException);
    expect(usersService.createUser).not.toHaveBeenCalled();
  });

  it.each([
    ['not-an-email', 'Password1'],
    ['user@example.com', 'short1'],
    ['user@example.com', 'password'],
    ['user@example.com', '12345678'],
  ])('rejects invalid register payloads', async (email, password) => {
    await expect(
      service.register({
        email,
        password,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(usersService.createUser).not.toHaveBeenCalled();
  });

  it('logs in active users with normalized email and updates lastLoginAt', async () => {
    const passwordHash = await hash('Password1', 12);
    const lastLoginAt = new Date('2026-06-24T09:00:00.000Z');
    usersService.findByEmailWithPasswordHash.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      passwordHash,
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      isEmailVerified: false,
      isPhoneVerified: false,
    });
    usersService.updateLastLoginAt.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      isEmailVerified: false,
      isPhoneVerified: false,
      lastLoginAt,
    });

    await expect(
      service.login({
        email: ' USER@Example.COM ',
        password: 'Password1',
      }),
    ).resolves.toEqual({
      user: {
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.User,
        permissions: [],
        status: UserStatus.Active,
        isEmailVerified: false,
        isPhoneVerified: false,
        lastLoginAt,
      },
      sessionToken: 'session-token',
      cookieOptions: {
        httpOnly: true,
        maxAge: 604800000,
        path: '/',
        sameSite: 'lax',
        secure: false,
      },
    });
    expect(usersService.findByEmailWithPasswordHash).toHaveBeenCalledWith('user@example.com');
    expect(usersService.updateLastLoginAt.mock.calls[0][0]).toBe('user-id');
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
    });
  });

  it('uses secure auth cookie settings in production', async () => {
    configService.get.mockReturnValue('production');
    const passwordHash = await hash('Password1', 12);
    usersService.findByEmailWithPasswordHash.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      passwordHash,
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      isEmailVerified: false,
      isPhoneVerified: false,
    });
    usersService.updateLastLoginAt.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'Password1',
      }),
    ).resolves.toMatchObject({
      cookieOptions: {
        secure: true,
      },
    });
  });

  it('rejects unknown users with a generic error', async () => {
    usersService.findByEmailWithPasswordHash.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'Password1',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(usersService.updateLastLoginAt).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rejects wrong passwords with a generic error', async () => {
    const passwordHash = await hash('Password1', 12);
    usersService.findByEmailWithPasswordHash.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      passwordHash,
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'WrongPassword1',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(usersService.updateLastLoginAt).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rejects inactive users with a generic error', async () => {
    const passwordHash = await hash('Password1', 12);
    usersService.findByEmailWithPasswordHash.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      passwordHash,
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Blocked,
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'Password1',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(usersService.updateLastLoginAt).not.toHaveBeenCalled();
  });

  it('returns cookie options for logout', () => {
    expect(service.logout()).toEqual({
      cookieOptions: {
        httpOnly: true,
        maxAge: 604800000,
        path: '/',
        sameSite: 'lax',
        secure: false,
      },
    });
  });

  it('returns the current authenticated user', () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: false,
      isPhoneVerified: false,
    };

    expect(service.getCurrentUser(user)).toEqual({ user });
  });
});
