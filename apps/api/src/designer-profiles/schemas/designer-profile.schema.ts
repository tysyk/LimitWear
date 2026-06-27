import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type DesignerProfileDocument = HydratedDocument<DesignerProfile>;

export enum DesignerProfileStatus {
  Pending = 'pending',
  Active = 'active',
  Suspended = 'suspended',
  Rejected = 'rejected',
}

export enum PayoutMethodStatus {
  NotProvided = 'not_provided',
  PendingReview = 'pending_review',
  Verified = 'verified',
  Rejected = 'rejected',
}

@Schema({
  collection: 'designer_profiles',
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.payoutDetails;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.payoutDetails;
      delete ret.__v;
      return ret;
    },
  },
})
export class DesignerProfile {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  displayName!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
  })
  slug!: string;

  @Prop({
    trim: true,
  })
  bio?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  avatarFileId?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  coverFileId?: Types.ObjectId;

  @Prop({
    type: Map,
    of: String,
    default: {},
  })
  socialLinks!: Record<string, string>;

  @Prop({
    type: [String],
    default: [],
  })
  portfolioLinks!: string[];

  @Prop({
    type: String,
    enum: Object.values(DesignerProfileStatus),
    default: DesignerProfileStatus.Pending,
    required: true,
  })
  status!: DesignerProfileStatus;

  @Prop()
  approvedAt?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  approvedBy?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(PayoutMethodStatus),
    default: PayoutMethodStatus.NotProvided,
    required: true,
  })
  payoutMethodStatus!: PayoutMethodStatus;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    select: false,
  })
  payoutDetails?: Record<string, unknown>;
}

export const DesignerProfileSchema = SchemaFactory.createForClass(DesignerProfile);

DesignerProfileSchema.index({ slug: 1 }, { unique: true });
DesignerProfileSchema.index({ userId: 1 }, { unique: true });
DesignerProfileSchema.index({ status: 1 });
