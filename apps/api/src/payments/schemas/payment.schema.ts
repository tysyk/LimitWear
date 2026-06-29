import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { PaymentStatus } from '@limitwear/shared';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

export enum PaymentProvider {
  Monobank = 'monobank',
}

export interface RawWebhookEvent {
  eventId: string;
  invoiceId: string;
  status?: string;
  receivedAt: Date;
  payload: Record<string, unknown>;
}

@Schema({
  collection: 'payments',
  timestamps: true,
})
export class Payment {
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
    enum: Object.values(PaymentProvider),
    default: PaymentProvider.Monobank,
    required: true,
  })
  provider!: PaymentProvider;

  @Prop({
    trim: true,
  })
  providerInvoiceId?: string;

  @Prop({
    trim: true,
  })
  providerPaymentId?: string;

  @Prop({
    trim: true,
  })
  invoiceUrl?: string;

  @Prop({
    required: true,
    min: 0,
  })
  amount!: number;

  @Prop({
    required: true,
    trim: true,
    uppercase: true,
    default: 'UAH',
  })
  currency!: string;

  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.Created,
    required: true,
  })
  status!: PaymentStatus;

  @Prop()
  holdExpiresAt?: Date;

  @Prop()
  finalizedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop({
    trim: true,
  })
  failureReason?: string;

  @Prop(
    raw([
      {
        eventId: {
          type: String,
          required: true,
          trim: true,
        },
        invoiceId: {
          type: String,
          required: true,
          trim: true,
        },
        status: {
          type: String,
          trim: true,
        },
        receivedAt: {
          type: Date,
          required: true,
        },
        payload: {
          type: MongooseSchema.Types.Mixed,
          required: true,
        },
      },
    ]),
  )
  rawWebhookEvents!: RawWebhookEvent[];
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ providerInvoiceId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ dropId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ holdExpiresAt: 1 });
PaymentSchema.index({ 'rawWebhookEvents.eventId': 1 });
