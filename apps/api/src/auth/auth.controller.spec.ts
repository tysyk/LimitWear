import { NotImplementedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('exposes register placeholder', () => {
    const registerSpy = jest.spyOn(service, 'register');

    expect(() =>
      controller.register({
        email: 'user@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
        phone: '+380000000000',
      }),
    ).toThrow(NotImplementedException);
    expect(registerSpy).toHaveBeenCalled();
  });

  it('exposes login placeholder', () => {
    const loginSpy = jest.spyOn(service, 'login');

    expect(() =>
      controller.login({
        email: 'user@example.com',
        password: 'password',
      }),
    ).toThrow(NotImplementedException);
    expect(loginSpy).toHaveBeenCalled();
  });

  it('exposes logout placeholder', () => {
    const logoutSpy = jest.spyOn(service, 'logout');

    expect(() => controller.logout()).toThrow(NotImplementedException);
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('exposes current user placeholder', () => {
    const getCurrentUserSpy = jest.spyOn(service, 'getCurrentUser');

    expect(() => controller.me()).toThrow(NotImplementedException);
    expect(getCurrentUserSpy).toHaveBeenCalled();
  });
});
