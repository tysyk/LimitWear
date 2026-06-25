import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { NotificationCategory, NotificationStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

export interface CreateNotificationInput {
  userId: Types.ObjectId | string;
  category: NotificationCategory;
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
      category: input.category,
      status: NotificationStatus.Unread,
      title: input.title,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId ? this.toObjectId(input.relatedEntityId) : undefined,
      metadata: input.metadata,
    });
  }

  private toObjectId(value: Types.ObjectId | string): Types.ObjectId {
    return value instanceof Types.ObjectId ? value : new Types.ObjectId(value);
  }
}
