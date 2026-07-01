import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole, UserStatus } from '@limitwear/shared';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const createQuery = (result: unknown) => ({
    exec: jest.fn().mockResolvedValue(result),
  });

  const createSelectableQuery = (result: unknown) => ({
    exec: jest.fn().mockResolvedValue(result),
    select: jest.fn().mockReturnThis(),
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
    telegramId: undefined,
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
      telegramId: undefined,
      isEmailVerified: false,
      isPhoneVerified: false,
      lastLoginAt: undefined,
    });
    expect(userModel.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
  });

  it('finds users by id', async () => {
    const userModel = {
      findById: jest.fn().mockReturnValue(createQuery(createUserDocument())),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    const service = new UsersService(userModel as never);

    await expect(service.findById('user-id')).resolves.toEqual({
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      firstName: 'Test',
      lastName: 'User',
      phone: '+380000000000',
      telegramUsername: undefined,
      telegramId: undefined,
      isEmailVerified: false,
      isPhoneVerified: false,
      lastLoginAt: undefined,
    });
    expect(userModel.findById).toHaveBeenCalledWith('user-id');
  });

  it('finds active admins for critical alerts', async () => {
    const adminDocument = {
      ...createUserDocument(),
      id: 'admin-id',
      email: 'admin@example.com',
      role: UserRole.Admin,
    };
    const userModel = {
      find: jest.fn().mockReturnValue(createQuery([adminDocument])),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    const service = new UsersService(userModel as never);

    await expect(service.findActiveAdmins()).resolves.toEqual([
      {
        id: 'admin-id',
        email: 'admin@example.com',
        role: UserRole.Admin,
        permissions: [],
        status: UserStatus.Active,
        firstName: 'Test',
        lastName: 'User',
        phone: '+380000000000',
        telegramUsername: undefined,
        telegramId: undefined,
        isEmailVerified: false,
        isPhoneVerified: false,
        lastLoginAt: undefined,
      },
    ]);
    expect(userModel.find).toHaveBeenCalledWith({
      role: UserRole.Admin,
      status: UserStatus.Active,
    });
  });

  it('finds users with passwordHash only when explicitly requested', async () => {
    const userDocument = {
      ...createUserDocument(),
      passwordHash: 'hashed-password',
    };
    const query = createSelectableQuery(userDocument);
    const userModel = {
      findOne: jest.fn().mockReturnValue(query),
      create: jest.fn(),
    };
    const service = new UsersService(userModel as never);

    await expect(service.findByEmailWithPasswordHash(' USER@Example.COM ')).resolves.toEqual({
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      firstName: 'Test',
      lastName: 'User',
      phone: '+380000000000',
      telegramUsername: undefined,
      telegramId: undefined,
      isEmailVerified: false,
      isPhoneVerified: false,
      lastLoginAt: undefined,
      passwordHash: 'hashed-password',
    });
    expect(userModel.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(query.select).toHaveBeenCalledWith('+passwordHash');
  });

  it('updates lastLoginAt', async () => {
    const lastLoginAt = new Date('2026-06-24T09:00:00.000Z');
    const userModel = {
      findByIdAndUpdate: jest
        .fn()
        .mockReturnValue(createQuery({ ...createUserDocument(), lastLoginAt })),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    const service = new UsersService(userModel as never);

    await expect(service.updateLastLoginAt('user-id', lastLoginAt)).resolves.toEqual({
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      firstName: 'Test',
      lastName: 'User',
      phone: '+380000000000',
      telegramUsername: undefined,
      telegramId: undefined,
      isEmailVerified: false,
      isPhoneVerified: false,
      lastLoginAt,
    });
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'user-id',
      { lastLoginAt },
      { new: true },
    );
  });

  it('throws NotFoundException when lastLoginAt user is missing', async () => {
    const userModel = {
      findByIdAndUpdate: jest.fn().mockReturnValue(createQuery(null)),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    const service = new UsersService(userModel as never);

    await expect(service.updateLastLoginAt('missing-user-id', new Date())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('links a Telegram account to the user profile', async () => {
    const linkedUser = {
      ...createUserDocument(),
      telegramId: '123456',
      telegramUsername: 'limitwear_user',
    };
    const userModel = {
      findByIdAndUpdate: jest.fn().mockReturnValue(createQuery(linkedUser)),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    const service = new UsersService(userModel as never);

    await expect(
      service.linkTelegramAccount('user-id', {
        telegramId: ' 123456 ',
        telegramUsername: ' limitwear_user ',
      }),
    ).resolves.toEqual({
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      firstName: 'Test',
      lastName: 'User',
      phone: '+380000000000',
      telegramUsername: 'limitwear_user',
      telegramId: '123456',
      isEmailVerified: false,
      isPhoneVerified: false,
      lastLoginAt: undefined,
    });
    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'user-id',
      {
        telegramId: '123456',
        telegramUsername: 'limitwear_user',
      },
      { new: true },
    );
  });

  it('throws NotFoundException when linking Telegram to a missing user', async () => {
    const userModel = {
      findByIdAndUpdate: jest.fn().mockReturnValue(createQuery(null)),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    const service = new UsersService(userModel as never);

    await expect(
      service.linkTelegramAccount('missing-user-id', {
        telegramId: '123456',
      }),
    ).rejects.toThrow(NotFoundException);
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
