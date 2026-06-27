import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type DesignDocument = HydratedDocument<Design>;

export enum DesignStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  UnderReview = 'under_review',
  NeedsChanges = 'needs_changes',
  Resubmitted = 'resubmitted',
  Approved = 'approved',
  Rejected = 'rejected',
  Archived = 'archived',
  Launched = 'launched',
}

@Schema({
  collection: 'designs',
  timestamps: true,
})
export class Design {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  designerId?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdByUserId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    trim: true,
    lowercase: true,
    sparse: true,
  })
  slug?: string;

  @Prop({
    trim: true,
  })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(DesignStatus),
    default: DesignStatus.Draft,
    required: true,
  })
  status!: DesignStatus;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  mainFileId?: Types.ObjectId;

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    default: [],
  })
  previewImageIds!: Types.ObjectId[];

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    default: [],
  })
  mockupImageIds!: Types.ObjectId[];

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    default: [],
  })
  productionFileIds!: Types.ObjectId[];

  @Prop({
    trim: true,
  })
  category?: string;

  @Prop({
    type: [String],
    default: [],
  })
  tags!: string[];

  @Prop({
    trim: true,
  })
  adminComment?: string;

  @Prop({
    trim: true,
  })
  rejectionReason?: string;

  @Prop()
  submittedAt?: Date;

  @Prop()
  approvedAt?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  approvedBy?: Types.ObjectId;
}

export const DesignSchema = SchemaFactory.createForClass(Design);

DesignSchema.index({ slug: 1 }, { unique: true, sparse: true });
DesignSchema.index({ designerId: 1 });
DesignSchema.index({ createdByUserId: 1 });
DesignSchema.index({ status: 1 });
DesignSchema.index({ title: 'text', tags: 'text' });
