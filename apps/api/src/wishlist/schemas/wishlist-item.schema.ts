import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export enum WishlistItemStatus {
  Active = 'active',
  Closed = 'closed',
  Archived = 'archived',
}

export type WishlistItemDocument = HydratedDocument<WishlistItem>;

@Schema({
  collection: 'wishlist_items',
  timestamps: true,
})
export class WishlistItem {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Drop',
    required: true,
  })
  dropId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(WishlistItemStatus),
    default: WishlistItemStatus.Active,
    required: true,
  })
  status!: WishlistItemStatus;

  @Prop({
    default: true,
    required: true,
  })
  notifyLowStock!: boolean;

  @Prop({
    default: true,
    required: true,
  })
  notifySecondChance!: boolean;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

WishlistItemSchema.index({ userId: 1, dropId: 1 }, { unique: true });
WishlistItemSchema.index({ userId: 1, status: 1 });
WishlistItemSchema.index({ dropId: 1, status: 1, notifyLowStock: 1 });
WishlistItemSchema.index({ dropId: 1, status: 1, notifySecondChance: 1 });
