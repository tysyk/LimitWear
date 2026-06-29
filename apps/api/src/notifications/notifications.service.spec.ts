import { NotificationCategory, NotificationChannel, NotificationStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationDocument } from './schemas/notification.schema';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationModel: {
    create: jest.Mock;
  };

  beforeEach(() => {
    notificationModel = {
      create: jest.fn(),
    };
    service = new NotificationsService(notificationModel as unknown as Model<NotificationDocument>);
  });

  it('creates unread in-app notifications for users', async () => {
    const createdNotification = { id: 'notification-id' } as NotificationDocument;
    const userId = new Types.ObjectId();
    const designId = new Types.ObjectId();
    notificationModel.create.mockResolvedValue(createdNotification);

    await expect(
      service.createForUser({
        userId,
        type: 'design.approved',
        category: NotificationCategory.Design,
        title: 'Design approved',
        message: 'Your design was approved.',
        relatedEntityType: 'design',
        relatedEntityId: designId,
        metadata: {
          status: 'approved',
        },
      }),
    ).resolves.toBe(createdNotification);

    expect(notificationModel.create).toHaveBeenCalledWith({
      userId,
      type: 'design.approved',
      category: NotificationCategory.Design,
      channel: NotificationChannel.InApp,
      status: NotificationStatus.Unread,
      title: 'Design approved',
      message: 'Your design was approved.',
      relatedEntityType: 'design',
      relatedEntityId: designId,
      metadata: {
        status: 'approved',
      },
    });
  });

  it('creates service/interest/marketing helpers as in-app notifications', async () => {
    const userId = new Types.ObjectId();
    const createdNotification = { id: 'notification-id' } as NotificationDocument;
    notificationModel.create.mockResolvedValue(createdNotification);

    await expect(
      service.createServiceNotification({
        userId,
        type: 'payment.failed',
        title: 'Payment failed',
        message: 'Please try another card.',
      }),
    ).resolves.toBe(createdNotification);

    expect(notificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        type: 'payment.failed',
        category: NotificationCategory.Service,
        channel: NotificationChannel.InApp,
      }),
    );
  });

  it('does not break the caller when safe notification creation fails', async () => {
    notificationModel.create.mockRejectedValue(new Error('database timeout'));

    await expect(
      service.safelyCreateServiceNotification({
        userId: new Types.ObjectId(),
        type: 'payment.failed',
        title: 'Payment failed',
        message: 'Please try another card.',
      }),
    ).resolves.toBeUndefined();
  });
});
