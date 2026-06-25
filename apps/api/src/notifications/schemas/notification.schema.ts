import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { NotificationCategory, NotificationStatus } from '@limitwear/shared';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({
  collection: 'notifications',
  timestamps: true,
})
export class Notification {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(NotificationCategory),
    required: true,
  })
  category!: NotificationCategory;

  @Prop({
    type: String,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.Unread,
    required: true,
  })
  status!: NotificationStatus;

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    required: true,
    trim: true,
  })
  message!: string;

  @Prop({
    trim: true,
  })
  relatedEntityType?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  relatedEntityId?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.Mixed,
  })
  metadata?: Record<string, unknown>;

  @Prop()
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ category: 1, createdAt: -1 });
NotificationSchema.index({ relatedEntityType: 1, relatedEntityId: 1 });
