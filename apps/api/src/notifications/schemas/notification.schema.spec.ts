import { NotificationCategory, NotificationChannel, NotificationStatus } from '@limitwear/shared';
import { Notification, NotificationSchema } from './notification.schema';

describe('NotificationSchema', () => {
  it('uses the notifications collection with timestamps', () => {
    expect(NotificationSchema.get('collection')).toBe('notifications');
    expect(NotificationSchema.get('timestamps')).toBe(true);
  });

  it('defines baseline notification fields and defaults', () => {
    expect(NotificationSchema.path('userId').options.required).toBe(true);
    expect(NotificationSchema.path('type').options.required).toBe(true);
    expect(NotificationSchema.path('category').options.enum).toEqual(
      Object.values(NotificationCategory),
    );
    expect(NotificationSchema.path('channel').options.enum).toEqual(
      Object.values(NotificationChannel),
    );
    expect(NotificationSchema.path('channel').options.default).toBe(NotificationChannel.InApp);
    expect(NotificationSchema.path('status').options.enum).toEqual(
      Object.values(NotificationStatus),
    );
    expect(NotificationSchema.path('status').options.default).toBe(NotificationStatus.Unread);
    expect(NotificationSchema.path('title').options.required).toBe(true);
    expect(NotificationSchema.path('message').options.required).toBe(true);
    expect(NotificationSchema.path('relatedEntityType')).toBeDefined();
    expect(NotificationSchema.path('relatedEntityId')).toBeDefined();
    expect(NotificationSchema.path('metadata')).toBeDefined();
    expect(NotificationSchema.path('readAt')).toBeDefined();
  });

  it('indexes user inbox and related entity lookups', () => {
    expect(NotificationSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ userId: 1, status: 1, createdAt: -1 }, expect.any(Object)],
        [{ userId: 1, createdAt: -1 }, expect.any(Object)],
        [{ category: 1, createdAt: -1 }, expect.any(Object)],
        [{ channel: 1, createdAt: -1 }, expect.any(Object)],
        [{ relatedEntityType: 1, relatedEntityId: 1 }, expect.any(Object)],
      ]),
    );
  });

  it('exposes the Notification class for Mongoose registration', () => {
    expect(Notification.name).toBe('Notification');
  });
});
