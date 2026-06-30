import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export enum SecondChanceListingStatus {
  Draft = 'draft',
  WishlistPriority = 'wishlist_priority',
  PublicAvailable = 'public_available',
  Reserved = 'reserved',
  Sold = 'sold',
  Expired = 'expired',
  Cancelled = 'cancelled',
}

export type SecondChanceListingDocument = HydratedDocument<SecondChanceListing>;

@Schema({
  collection: 'second_chance_listings',
  timestamps: true,
})
export class SecondChanceListing {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Drop',
    required: true,
  })
  dropId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Order',
  })
  sourceOrderId?: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  size!: string;

  @Prop({
    required: true,
    min: 1,
    default: 1,
  })
  quantity!: number;

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
    type: String,
    enum: Object.values(SecondChanceListingStatus),
    default: SecondChanceListingStatus.Draft,
    required: true,
  })
  status!: SecondChanceListingStatus;

  @Prop()
  priorityWindowUntil?: Date;

  @Prop()
  publicAvailableAt?: Date;

  @Prop()
  soldAt?: Date;
}

export const SecondChanceListingSchema = SchemaFactory.createForClass(SecondChanceListing);

SecondChanceListingSchema.index({ dropId: 1, status: 1 });
SecondChanceListingSchema.index({ sourceOrderId: 1 });
SecondChanceListingSchema.index({ status: 1, priorityWindowUntil: 1 });
SecondChanceListingSchema.index({ status: 1, publicAvailableAt: 1 });
