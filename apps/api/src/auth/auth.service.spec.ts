import { BadRequestException, ConflictException, NotImplementedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@limitwear/shared';
import { compare } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findByEmail' | 'createUser'>>;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      createUser: jest.fn(),
    };

    service = new AuthService(usersService as unknown as UsersService);
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

  it('keeps login placeholder for LW-013', () => {
    expect(() =>
      service.login({
        email: 'user@example.com',
        password: 'Password1',
      }),
    ).toThrow(NotImplementedException);
  });
});
