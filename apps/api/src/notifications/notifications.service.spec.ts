import { NotificationCategory, NotificationChannel, NotificationStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { EmailProviderService } from './email-provider.service';
import { NotificationsService } from './notifications.service';
import { TelegramProviderService } from './telegram-provider.service';
import { NotificationDocument } from './schemas/notification.schema';
import { NotificationSettingsDocument } from './schemas/notification-settings.schema';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationModel: {
    create: jest.Mock;
    find: jest.Mock;
    updateMany: jest.Mock;
  };
  let notificationSettingsModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let emailProviderService: {
    sendTransactional: jest.Mock;
  };
  let telegramProviderService: {
    sendMessage: jest.Mock;
  };

  beforeEach(() => {
    notificationModel = {
      create: jest.fn(),
      find: jest.fn(),
      updateMany: jest.fn(),
    };
    notificationSettingsModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };
    emailProviderService = {
      sendTransactional: jest.fn(),
    };
    telegramProviderService = {
      sendMessage: jest.fn(),
    };
    service = new NotificationsService(
      notificationModel as unknown as Model<NotificationDocument>,
      notificationSettingsModel as unknown as Model<NotificationSettingsDocument>,
      emailProviderService as unknown as EmailProviderService,
      telegramProviderService as unknown as TelegramProviderService,
    );
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

  it('sends transactional email through the provider abstraction', async () => {
    emailProviderService.sendTransactional.mockResolvedValue({
      status: 'sent',
      providerMessageId: 'provider-message-id',
    });

    await expect(
      service.sendEmail({
        to: 'customer@example.com',
        subject: 'Order update',
        text: 'Your order was updated.',
      }),
    ).resolves.toEqual({
      status: 'sent',
      providerMessageId: 'provider-message-id',
    });
    expect(emailProviderService.sendTransactional).toHaveBeenCalledWith({
      to: 'customer@example.com',
      subject: 'Order update',
      text: 'Your order was updated.',
    });
  });

  it('does not break the caller when email provider throws', async () => {
    emailProviderService.sendTransactional.mockRejectedValue(new Error('provider timeout'));

    await expect(
      service.sendEmail({
        to: 'customer@example.com',
        subject: 'Order update',
        text: 'Your order was updated.',
      }),
    ).resolves.toEqual({
      status: 'failed',
      error: 'email_delivery_exception',
    });
  });

  it('sends Telegram messages through the provider abstraction', async () => {
    telegramProviderService.sendMessage.mockResolvedValue({
      status: 'sent',
      providerMessageId: '42',
    });

    await expect(
      service.sendTelegram({
        telegramId: '123456',
        text: 'Order update',
      }),
    ).resolves.toEqual({
      status: 'sent',
      providerMessageId: '42',
    });
    expect(telegramProviderService.sendMessage).toHaveBeenCalledWith({
      telegramId: '123456',
      text: 'Order update',
    });
  });

  it('does not break the caller when Telegram provider throws', async () => {
    telegramProviderService.sendMessage.mockRejectedValue(new Error('telegram timeout'));

    await expect(
      service.sendTelegram({
        telegramId: '123456',
        text: 'Order update',
      }),
    ).resolves.toEqual({
      status: 'failed',
      error: 'telegram_delivery_exception',
    });
  });

  it('lists notifications with optional status filters', async () => {
    const userId = new Types.ObjectId();
    const notifications = [{ id: 'notification-id' }];
    const exec = jest.fn().mockResolvedValue(notifications);
    const lean = jest.fn().mockReturnValue({ exec });
    const sort = jest.fn().mockReturnValue({ lean });
    notificationModel.find.mockReturnValue({ sort });

    await expect(service.listForUser(userId, { status: NotificationStatus.Unread })).resolves.toBe(
      notifications,
    );

    expect(notificationModel.find).toHaveBeenCalledWith({
      userId,
      status: NotificationStatus.Unread,
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('marks all unread notifications as read', async () => {
    const userId = new Types.ObjectId();
    notificationModel.updateMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 3 }),
    });

    await expect(service.markAllRead(userId)).resolves.toEqual({ modifiedCount: 3 });
    expect(notificationModel.updateMany).toHaveBeenCalledWith(
      {
        userId,
        status: NotificationStatus.Unread,
      },
      expect.any(Object),
    );
    const [, update] = notificationModel.updateMany.mock.calls[0] as [
      unknown,
      { $set: { status: NotificationStatus; readAt: Date } },
    ];
    expect(update.$set.status).toBe(NotificationStatus.Read);
    expect(update.$set.readAt).toBeInstanceOf(Date);
  });

  it('creates default notification settings with marketing disabled', async () => {
    const userId = new Types.ObjectId();
    const settings = { id: 'settings-id' } as NotificationSettingsDocument;
    notificationSettingsModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    notificationSettingsModel.create.mockResolvedValue(settings);

    await expect(service.getSettings(userId)).resolves.toBe(settings);
    expect(notificationSettingsModel.create).toHaveBeenCalledWith({
      userId,
      emailEnabled: true,
      telegramEnabled: false,
      wishlistEnabled: true,
      secondChanceEnabled: true,
      marketingOptIn: false,
      inAppEnabled: true,
    });
  });

  it('updates settings while keeping in-app notifications enabled', async () => {
    const userId = new Types.ObjectId();
    const settings = { id: 'settings-id', inAppEnabled: true } as NotificationSettingsDocument;
    notificationSettingsModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(settings),
    });

    await expect(
      service.updateSettings(userId, {
        emailEnabled: false,
        telegramEnabled: true,
        marketingOptIn: true,
      }),
    ).resolves.toBe(settings);

    expect(notificationSettingsModel.findOneAndUpdate).toHaveBeenCalledWith(
      { userId },
      expect.any(Object),
      expect.objectContaining({
        new: true,
        upsert: true,
      }),
    );
    const [, update] = notificationSettingsModel.findOneAndUpdate.mock.calls[0] as [
      unknown,
      {
        $set: {
          emailEnabled: boolean;
          telegramEnabled: boolean;
          marketingOptIn: boolean;
          inAppEnabled: true;
        };
      },
    ];
    expect(update.$set).toEqual(
      expect.objectContaining({
        emailEnabled: false,
        telegramEnabled: true,
        marketingOptIn: true,
        inAppEnabled: true,
      }),
    );
  });
});
