import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { UserRole, UserStatus } from '@limitwear/shared';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  collection: 'users',
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.passwordHash;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.passwordHash;
      delete ret.__v;
      return ret;
    },
  },
})
export class User {
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  })
  email!: string;

  @Prop({
    required: true,
    select: false,
  })
  passwordHash!: string;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.User,
    required: true,
  })
  role!: UserRole;

  @Prop({
    type: [String],
    default: [],
  })
  permissions!: string[];

  @Prop({
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.Active,
    required: true,
  })
  status!: UserStatus;

  @Prop({
    trim: true,
  })
  firstName?: string;

  @Prop({
    trim: true,
  })
  lastName?: string;

  @Prop({
    trim: true,
  })
  phone?: string;

  @Prop({
    trim: true,
  })
  telegramUsername?: string;

  @Prop({
    trim: true,
  })
  telegramId?: string;

  @Prop({
    default: false,
  })
  isEmailVerified!: boolean;

  @Prop({
    default: false,
  })
  isPhoneVerified!: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  notificationSettingsId?: MongooseSchema.Types.ObjectId;

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
