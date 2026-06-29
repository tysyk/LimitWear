import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type NotificationSettingsDocument = HydratedDocument<NotificationSettings>;

@Schema({
  collection: 'notification_settings',
  timestamps: true,
})
export class NotificationSettings {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    default: true,
    required: true,
  })
  emailEnabled!: boolean;

  @Prop({
    default: false,
    required: true,
  })
  telegramEnabled!: boolean;

  @Prop({
    default: true,
    required: true,
  })
  wishlistEnabled!: boolean;

  @Prop({
    default: true,
    required: true,
  })
  secondChanceEnabled!: boolean;

  @Prop({
    default: false,
    required: true,
  })
  marketingOptIn!: boolean;

  @Prop({
    default: true,
    required: true,
  })
  inAppEnabled!: boolean;
}

export const NotificationSettingsSchema = SchemaFactory.createForClass(NotificationSettings);

NotificationSettingsSchema.index({ userId: 1 }, { unique: true });
