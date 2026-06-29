import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DeliveryStatus } from '@limitwear/shared';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { DeliveryType } from '../../orders/dto/create-order.dto';

export type DeliveryDocument = HydratedDocument<Delivery>;

export enum DeliveryProvider {
  NovaPoshta = 'nova_poshta',
}

@Schema({
  collection: 'deliveries',
  timestamps: true,
})
export class Delivery {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Order',
    required: true,
  })
  orderId!: Types.ObjectId;

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
    enum: Object.values(DeliveryProvider),
    default: DeliveryProvider.NovaPoshta,
    required: true,
  })
  provider!: DeliveryProvider;

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
    required: true,
    trim: true,
  })
  cityName!: string;

  @Prop({
    required: true,
    trim: true,
  })
  cityRef!: string;

  @Prop({
    required: true,
    trim: true,
  })
  warehouseName!: string;

  @Prop({
    required: true,
    trim: true,
  })
  warehouseRef!: string;

  @Prop({
    trim: true,
  })
  address?: string;

  @Prop({
    type: String,
    enum: Object.values(DeliveryType),
    required: true,
  })
  deliveryType!: DeliveryType;

  @Prop({
    trim: true,
  })
  trackingNumber?: string;

  @Prop({
    trim: true,
  })
  novaPostDocumentRef?: string;

  @Prop({
    type: String,
    enum: Object.values(DeliveryStatus),
    default: DeliveryStatus.NotCreated,
    required: true,
  })
  status!: DeliveryStatus;

  @Prop()
  ttnCreatedAt?: Date;

  @Prop()
  shippedAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  returnedAt?: Date;
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);

DeliverySchema.index({ orderId: 1 });
DeliverySchema.index({ trackingNumber: 1 });
DeliverySchema.index({ status: 1 });
DeliverySchema.index({ cityRef: 1 });
DeliverySchema.index({ warehouseRef: 1 });
