import { ConflictException } from '@nestjs/common';
import { UserRole, UserStatus } from '@limitwear/shared';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const createQuery = (result: unknown) => ({
    exec: jest.fn().mockResolvedValue(result),
  });

  const createUserDocument = () => ({
    id: 'user-id',
    email: 'user@example.com',
    role: UserRole.User,
    permissions: [],
    status: UserStatus.Active,
    firstName: 'Test',
    lastName: 'User',
    phone: '+380000000000',
    telegramUsername: undefined,
    isEmailVerified: false,
    isPhoneVerified: false,
    lastLoginAt: undefined,
  });

  it('finds users by normalized email', async () => {
    const userModel = {
      findOne: jest.fn().mockReturnValue(createQuery(createUserDocument())),
      create: jest.fn(),
    };
    const service = new UsersService(userModel as never);

    await expect(service.findByEmail(' USER@Example.COM ')).resolves.toEqual({
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      firstName: 'Test',
      lastName: 'User',
      phone: '+380000000000',
      telegramUsername: undefined,
      isEmailVerified: false,
      isPhoneVerified: false,
      lastLoginAt: undefined,
    });
    expect(userModel.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
  });

  it('creates public users without exposing passwordHash', async () => {
    const userModel = {
      findOne: jest.fn(),
      create: jest.fn().mockResolvedValue(createUserDocument()),
    };
    const service = new UsersService(userModel as never);

    const user = await service.createUser({
      email: ' USER@Example.COM ',
      passwordHash: 'hashed-password',
      firstName: 'Test',
    });

    expect(user).not.toHaveProperty('passwordHash');
    expect(userModel.create).toHaveBeenCalledWith({
      email: 'user@example.com',
      passwordHash: 'hashed-password',
      firstName: 'Test',
      lastName: undefined,
      phone: undefined,
    });
  });

  it('maps duplicate key errors to ConflictException', async () => {
    const userModel = {
      findOne: jest.fn(),
      create: jest.fn().mockRejectedValue({ code: 11000 }),
    };
    const service = new UsersService(userModel as never);

    await expect(
      service.createUser({
        email: 'user@example.com',
        passwordHash: 'hashed-password',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
