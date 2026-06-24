import { UserRole, UserStatus } from '@limitwear/shared';
import { User, UserSchema } from './user.schema';

describe('UserSchema', () => {
  it('uses the users collection with timestamps', () => {
    expect(UserSchema.get('collection')).toBe('users');
    expect(UserSchema.get('timestamps')).toBe(true);
  });

  it('defines baseline user fields and defaults', () => {
    const emailPath = UserSchema.path('email');
    const passwordHashPath = UserSchema.path('passwordHash');
    const rolePath = UserSchema.path('role');
    const statusPath = UserSchema.path('status');

    expect(emailPath.options.required).toBe(true);
    expect(emailPath.options.unique).toBe(true);
    expect(emailPath.options.lowercase).toBe(true);
    expect(passwordHashPath.options.required).toBe(true);
    expect(passwordHashPath.options.select).toBe(false);
    expect(rolePath.options.enum).toEqual(Object.values(UserRole));
    expect(rolePath.options.default).toBe(UserRole.User);
    expect(statusPath.options.enum).toEqual(Object.values(UserStatus));
    expect(statusPath.options.default).toBe(UserStatus.Active);

    expect(UserSchema.path('permissions').options.default).toEqual([]);
    expect(UserSchema.path('firstName')).toBeDefined();
    expect(UserSchema.path('lastName')).toBeDefined();
    expect(UserSchema.path('phone')).toBeDefined();
    expect(UserSchema.path('telegramUsername')).toBeDefined();
    expect(UserSchema.path('telegramId')).toBeDefined();
    expect(UserSchema.path('isEmailVerified').options.default).toBe(false);
    expect(UserSchema.path('isPhoneVerified').options.default).toBe(false);
    expect(UserSchema.path('notificationSettingsId')).toBeDefined();
    expect(UserSchema.path('lastLoginAt')).toBeDefined();
  });

  it('indexes role and status for admin search', () => {
    expect(UserSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ role: 1 }, expect.any(Object)],
        [{ status: 1 }, expect.any(Object)],
      ]),
    );
  });

  it('strips passwordHash and __v from serialized users', () => {
    type SchemaTransform = (
      doc: unknown,
      ret: Record<string, unknown>,
      options: Record<string, unknown>,
    ) => Record<string, unknown>;

    const transform: unknown = UserSchema.get('toJSON')?.transform;

    if (typeof transform !== 'function') {
      throw new Error('Expected UserSchema toJSON transform to be a function');
    }

    const serialized = (transform as SchemaTransform)(
      {},
      {
        email: 'user@example.com',
        passwordHash: 'hashed-password',
        __v: 0,
      },
      {},
    );

    expect(serialized).toEqual({
      email: 'user@example.com',
    });
  });

  it('exposes the User class for Mongoose registration', () => {
    expect(User.name).toBe('User');
  });
});
