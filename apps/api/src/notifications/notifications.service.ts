import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NotificationCategory, NotificationChannel, NotificationStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

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

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
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

  private toObjectId(value: Types.ObjectId | string): Types.ObjectId {
    return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
  }
}
