import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, UserStatus } from '@limitwear/shared';
import type { Response } from 'express';
import { AUTH_COOKIE_NAME } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import type { AuthenticatedRequest } from './types/authenticated-request';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
            getCurrentUser: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('exposes register endpoint', async () => {
    service.register.mockResolvedValue({
      user: {
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.User,
        permissions: [],
        status: UserStatus.Active,
        isEmailVerified: false,
        isPhoneVerified: false,
      },
    });

    await expect(
      controller.register({
        email: 'user@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
        phone: '+380000000000',
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
      },
    });
    expect(service.register.mock.calls[0][0]).toEqual({
      email: 'user@example.com',
      password: 'password',
      firstName: 'Test',
      lastName: 'User',
      phone: '+380000000000',
    });
  });

  it('exposes login endpoint and writes the auth cookie', async () => {
    const cookieOptions = {
      httpOnly: true,
      maxAge: 604800000,
      path: '/',
      sameSite: 'lax' as const,
      secure: false,
    };
    const cookie = jest.fn();
    const response = {
      cookie,
    } as unknown as Response;
    service.login.mockResolvedValue({
      user: {
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.User,
        permissions: [],
        status: UserStatus.Active,
        isEmailVerified: false,
        isPhoneVerified: false,
      },
      sessionToken: 'session-token',
      cookieOptions,
    });

    await expect(
      controller.login(
        {
          email: 'user@example.com',
          password: 'password',
        },
        response,
      ),
    ).resolves.toEqual({
      user: {
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.User,
        permissions: [],
        status: UserStatus.Active,
        isEmailVerified: false,
        isPhoneVerified: false,
      },
    });
    expect(cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, 'session-token', cookieOptions);
    expect(service.login.mock.calls).toHaveLength(1);
  });

  it('exposes logout endpoint and clears the auth cookie', () => {
    const cookieOptions = {
      httpOnly: true,
      maxAge: 604800000,
      path: '/',
      sameSite: 'lax' as const,
      secure: false,
    };
    const clearCookie = jest.fn();
    const response = {
      clearCookie,
    } as unknown as Response;
    service.logout.mockReturnValue({
      cookieOptions,
    });

    expect(controller.logout(response)).toEqual({ success: true });
    expect(clearCookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, cookieOptions);
    expect(service.logout.mock.calls).toHaveLength(1);
  });

  it('exposes current user endpoint', () => {
    const request = {
      user: {
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.User,
        permissions: [],
        status: UserStatus.Active,
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: false,
        isPhoneVerified: false,
      },
    } as unknown as AuthenticatedRequest;
    service.getCurrentUser.mockReturnValue({
      user: request.user,
    });

    expect(controller.me(request)).toEqual({
      user: request.user,
    });
    expect(service.getCurrentUser.mock.calls[0][0]).toBe(request.user);
    expect(service.getCurrentUser.mock.calls).toHaveLength(1);
  });
});
