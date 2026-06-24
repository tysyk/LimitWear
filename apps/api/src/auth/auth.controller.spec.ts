import { NotImplementedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, UserStatus } from '@limitwear/shared';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

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
    }).compile();

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

  it('exposes login placeholder', () => {
    service.login.mockImplementation(() => {
      throw new NotImplementedException();
    });

    expect(() =>
      controller.login({
        email: 'user@example.com',
        password: 'password',
      }),
    ).toThrow(NotImplementedException);
    expect(service.login.mock.calls).toHaveLength(1);
  });

  it('exposes logout placeholder', () => {
    service.logout.mockImplementation(() => {
      throw new NotImplementedException();
    });

    expect(() => controller.logout()).toThrow(NotImplementedException);
    expect(service.logout.mock.calls).toHaveLength(1);
  });

  it('exposes current user placeholder', () => {
    service.getCurrentUser.mockImplementation(() => {
      throw new NotImplementedException();
    });

    expect(() => controller.me()).toThrow(NotImplementedException);
    expect(service.getCurrentUser.mock.calls).toHaveLength(1);
  });
});
