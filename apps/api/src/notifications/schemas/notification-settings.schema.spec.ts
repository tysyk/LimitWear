import { NotificationSettings, NotificationSettingsSchema } from './notification-settings.schema';

describe('NotificationSettingsSchema', () => {
  it('uses the notification_settings collection with timestamps', () => {
    expect(NotificationSettingsSchema.get('collection')).toBe('notification_settings');
    expect(NotificationSettingsSchema.get('timestamps')).toBe(true);
  });

  it('defines baseline notification settings defaults', () => {
    expect(NotificationSettingsSchema.path('userId').options.required).toBe(true);
    expect(NotificationSettingsSchema.path('emailEnabled').options.default).toBe(true);
    expect(NotificationSettingsSchema.path('telegramEnabled').options.default).toBe(false);
    expect(NotificationSettingsSchema.path('wishlistEnabled').options.default).toBe(true);
    expect(NotificationSettingsSchema.path('secondChanceEnabled').options.default).toBe(true);
    expect(NotificationSettingsSchema.path('marketingOptIn').options.default).toBe(false);
    expect(NotificationSettingsSchema.path('inAppEnabled').options.default).toBe(true);
  });

  it('indexes settings by user', () => {
    expect(NotificationSettingsSchema.indexes()).toEqual(
      expect.arrayContaining([[{ userId: 1 }, { unique: true }]]),
    );
  });

  it('exposes the NotificationSettings class for Mongoose registration', () => {
    expect(NotificationSettings.name).toBe('NotificationSettings');
  });
});
