import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DropStatus } from '@limitwear/shared';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type DropDocument = HydratedDocument<Drop>;

export enum ProductType {
  TShirt = 'tshirt',
  Hoodie = 'hoodie',
  Sweatshirt = 'sweatshirt',
  Longsleeve = 'longsleeve',
  Cap = 'cap',
}

@Schema({
  collection: 'drops',
  timestamps: true,
})
export class Drop {
  @Prop({
    required: true,
    trim: true,
    unique: true,
  })
  dropNumber!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
  })
  designId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  designerId?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  collectionId?: Types.ObjectId;

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
    type: String,
    enum: Object.values(ProductType),
    required: true,
  })
  productType!: ProductType;

  @Prop({
    trim: true,
  })
  productColor?: string;

  @Prop({
    trim: true,
  })
  productBase?: string;

  @Prop({
    trim: true,
  })
  material?: string;

  @Prop({
    required: true,
    min: 0,
  })
  price!: number;

  @Prop({
    required: true,
    trim: true,
    uppercase: true,
    default: 'UAH',
  })
  currency!: string;

  @Prop({
    required: true,
    min: 0,
    max: 100,
  })
  designerRevenuePercent!: number;

  @Prop({
    required: true,
    min: 1,
  })
  minQuantity!: number;

  @Prop({
    required: true,
    min: 1,
  })
  maxQuantity!: number;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  currentQuantity!: number;

  @Prop({
    min: 0,
  })
  finalQuantity?: number;

  @Prop({
    type: [String],
    default: [],
  })
  sizeOptions!: string[];

  @Prop({
    type: Map,
    of: Number,
    default: {},
  })
  sizeBreakdown!: Record<string, number>;

  @Prop({
    type: String,
    enum: Object.values(DropStatus),
    default: DropStatus.Draft,
    required: true,
  })
  status!: DropStatus;

  @Prop()
  startsAt?: Date;

  @Prop()
  endsAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  foreverClosedAt?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  mainImageId?: Types.ObjectId;

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    default: [],
  })
  imageIds!: Types.ObjectId[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  createdByAdminId?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  approvedByAdminId?: Types.ObjectId;
}

export const DropSchema = SchemaFactory.createForClass(Drop);

DropSchema.index({ slug: 1 }, { unique: true });
DropSchema.index({ dropNumber: 1 }, { unique: true });
DropSchema.index({ status: 1 });
DropSchema.index({ startsAt: 1 });
DropSchema.index({ endsAt: 1 });
DropSchema.index({ collectionId: 1 });
DropSchema.index({ designerId: 1 });
DropSchema.index({ status: 1, startsAt: 1, endsAt: 1 });
