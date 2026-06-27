import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { OrderStatus } from '@limitwear/shared';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { DeliveryType } from '../dto/create-order.dto';

export type OrderDocument = HydratedDocument<Order>;

export interface OrderDeliveryData {
  cityRef: string;
  cityName: string;
  warehouseRef: string;
  warehouseName: string;
  deliveryType: DeliveryType;
}

@Schema({
  collection: 'orders',
  timestamps: true,
})
export class Order {
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
    type: MongooseSchema.Types.ObjectId,
    ref: 'Design',
    required: true,
  })
  designId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Collection',
  })
  collectionId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PendingPayment,
    required: true,
  })
  status!: OrderStatus;

  @Prop({
    required: true,
    min: 1,
  })
  quantity!: number;

  @Prop({
    required: true,
    trim: true,
  })
  size!: string;

  @Prop({
    required: true,
    min: 0,
  })
  priceAtPurchase!: number;

  @Prop({
    required: true,
    trim: true,
    uppercase: true,
    default: 'UAH',
  })
  currency!: string;

  @Prop({
    required: true,
    trim: true,
  })
  recipientName!: string;

  @Prop({
    required: true,
    trim: true,
  })
  recipientPhone!: string;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  deliveryData!: OrderDeliveryData;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  paymentId?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  deliveryId?: Types.ObjectId;

  @Prop({
    default: true,
    required: true,
  })
  canCancel!: boolean;

  @Prop({
    trim: true,
  })
  cancelBlockedReason?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  cancelledAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ dropId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentId: 1 });
OrderSchema.index({ deliveryId: 1 });
