import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type CollectionDocument = HydratedDocument<Collection>;

export enum CollectionStatus {
  Draft = 'draft',
  UnderReview = 'under_review',
  Approved = 'approved',
  Published = 'published',
  Archived = 'archived',
}

@Schema({
  collection: 'collections',
  timestamps: true,
})
export class Collection {
  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
  })
  slug!: string;

  @Prop({
    trim: true,
  })
  description?: string;

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    default: [],
  })
  dropIds!: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  primaryDesignerId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    default: [],
  })
  designerIds!: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: String,
    enum: Object.values(CollectionStatus),
    default: CollectionStatus.Draft,
    required: true,
  })
  status!: CollectionStatus;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  coverImageId?: MongooseSchema.Types.ObjectId;

  @Prop({
    default: false,
  })
  featured!: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
  })
  createdByUserId!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  approvedByAdminId?: MongooseSchema.Types.ObjectId;

  @Prop()
  publishedAt?: Date;
}

export const CollectionSchema = SchemaFactory.createForClass(Collection);

CollectionSchema.index({ slug: 1 }, { unique: true });
CollectionSchema.index({ status: 1 });
CollectionSchema.index({ featured: 1 });
CollectionSchema.index({ designerIds: 1 });
CollectionSchema.index({ status: 1, featured: 1 });
