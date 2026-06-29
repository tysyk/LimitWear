import { validateUpdateNotificationSettingsDto } from './update-notification-settings.dto';

describe('validateUpdateNotificationSettingsDto', () => {
  it('normalizes optional boolean settings and always keeps in-app on', () => {
    expect(
      validateUpdateNotificationSettingsDto({
        emailEnabled: false,
        telegramEnabled: true,
        wishlistEnabled: true,
        secondChanceEnabled: false,
        marketingOptIn: true,
      }),
    ).toEqual({
      emailEnabled: false,
      telegramEnabled: true,
      wishlistEnabled: true,
      secondChanceEnabled: false,
      marketingOptIn: true,
      inAppEnabled: true,
    });
  });
});
