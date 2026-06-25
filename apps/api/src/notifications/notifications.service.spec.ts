import { NotificationCategory, NotificationStatus } from '@limitwear/shared';
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
      category: NotificationCategory.Design,
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
});
