import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NotificationCategory, NotificationChannel, NotificationStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import {
  UpdateNotificationSettingsDto,
  validateUpdateNotificationSettingsDto,
} from './dto/update-notification-settings.dto';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import {
  NotificationSettings,
  NotificationSettingsDocument,
} from './schemas/notification-settings.schema';

export interface CreateNotificationInput {
  userId: Types.ObjectId | string;
  type: string;
  category: NotificationCategory;
  channel?: NotificationChannel;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
}

export interface ListNotificationsInput {
  status?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationSettings.name)
    private readonly notificationSettingsModel: Model<NotificationSettingsDocument>,
  ) {}

  async createForUser(input: CreateNotificationInput): Promise<NotificationDocument> {
    return this.notificationModel.create({
      userId: this.toObjectId(input.userId),
      type: input.type,
      category: input.category,
      channel: input.channel ?? NotificationChannel.InApp,
      status: NotificationStatus.Unread,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId ? this.toObjectId(input.relatedEntityId) : undefined,
      metadata: input.metadata,
    });
  }

  async createInApp(
    input: Omit<CreateNotificationInput, 'channel'>,
  ): Promise<NotificationDocument> {
    return this.createForUser({
      ...input,
      channel: NotificationChannel.InApp,
    });
  }

  async createServiceNotification(
    input: Omit<CreateNotificationInput, 'category' | 'channel'>,
  ): Promise<NotificationDocument> {
    return this.createInApp({
      ...input,
      category: NotificationCategory.Service,
    });
  }

  async createInterestNotification(
    input: Omit<CreateNotificationInput, 'category' | 'channel'>,
  ): Promise<NotificationDocument> {
    return this.createInApp({
      ...input,
      category: NotificationCategory.Interest,
    });
  }

  async createMarketingNotification(
    input: Omit<CreateNotificationInput, 'category' | 'channel'>,
  ): Promise<NotificationDocument> {
    return this.createInApp({
      ...input,
      category: NotificationCategory.Marketing,
    });
  }

  sendEmail(): Promise<void> {
    return Promise.resolve();
  }

  sendTelegram(): Promise<void> {
    return Promise.resolve();
  }

  async safelyCreateServiceNotification(
    input: Omit<CreateNotificationInput, 'category' | 'channel'>,
  ): Promise<NotificationDocument | undefined> {
    try {
      return await this.createServiceNotification(input);
    } catch {
      return undefined;
    }
  }

  async listForUser(
    userId: Types.ObjectId | string,
    input: ListNotificationsInput = {},
  ): Promise<Notification[]> {
    const filter: Record<string, unknown> = {
      userId: this.toObjectId(userId),
    };

    if (input.status) {
      if (!Object.values(NotificationStatus).includes(input.status as NotificationStatus)) {
        throw new BadRequestException('Notification status filter is invalid.');
      }
      filter.status = input.status;
    }

    return this.notificationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean<Notification[]>()
      .exec();
  }

  async markAllRead(userId: Types.ObjectId | string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel
      .updateMany(
        {
          userId: this.toObjectId(userId),
          status: NotificationStatus.Unread,
        },
        {
          $set: {
            status: NotificationStatus.Read,
            readAt: new Date(),
          },
        },
      )
      .exec();

    return {
      modifiedCount: result.modifiedCount ?? 0,
    };
  }

  async getSettings(userId: Types.ObjectId | string): Promise<NotificationSettingsDocument> {
    const normalizedUserId = this.toObjectId(userId);
    const existing = await this.notificationSettingsModel
      .findOne({ userId: normalizedUserId })
      .exec();

    if (existing) {
      return existing;
    }

    return this.notificationSettingsModel.create({
      userId: normalizedUserId,
      emailEnabled: true,
      telegramEnabled: false,
      wishlistEnabled: true,
      secondChanceEnabled: true,
      marketingOptIn: false,
      inAppEnabled: true,
    });
  }

  async updateSettings(
    userId: Types.ObjectId | string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsDocument> {
    const input = validateUpdateNotificationSettingsDto(dto);
    const normalizedUserId = this.toObjectId(userId);

    return this.notificationSettingsModel
      .findOneAndUpdate(
        { userId: normalizedUserId },
        {
          $set: {
            ...input,
            inAppEnabled: true,
          },
          $setOnInsert: {
            userId: normalizedUserId,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();
  }

  private toObjectId(value: Types.ObjectId | string): Types.ObjectId {
    return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
  }
}
