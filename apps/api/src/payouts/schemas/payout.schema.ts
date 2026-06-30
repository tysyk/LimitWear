import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type PayoutDocument = HydratedDocument<Payout>;

export enum PayoutStatus {
  Pending = 'pending',
  Scheduled = 'scheduled',
  ReadyToPay = 'ready_to_pay',
  PartiallyPaid = 'partially_paid',
  Paid = 'paid',
  Cancelled = 'cancelled',
  Disputed = 'disputed',
}

export interface PayoutCalculationBase {
  soldUnits: number;
  returnedUnits: number;
  secondChanceSoldUnits: number;
  grossRevenue: number;
  returnedRevenue: number;
  secondChanceRevenue: number;
  netRevenue: number;
  eligibleOrderCount: number;
  returnWindowEndsAt?: Date;
}

@Schema({
  collection: 'payouts',
  timestamps: true,
})
export class Payout {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'DesignerProfile',
    required: true,
  })
  designerId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Drop',
    required: true,
  })
  dropId!: Types.ObjectId;

  @Prop({
    required: true,
    min: 0,
  })
  amount!: number;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  paidAmount!: number;

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
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  calculationBase!: PayoutCalculationBase;

  @Prop({
    type: String,
    enum: Object.values(PayoutStatus),
    default: PayoutStatus.Pending,
    required: true,
  })
  status!: PayoutStatus;

  @Prop()
  scheduledAt?: Date;

  @Prop()
  paidAt?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  paidByAdminId?: Types.ObjectId;

  @Prop({
    trim: true,
  })
  notes?: string;
}

export const PayoutSchema = SchemaFactory.createForClass(Payout);

PayoutSchema.index({ designerId: 1, createdAt: -1 });
PayoutSchema.index({ dropId: 1 }, { unique: true });
PayoutSchema.index({ status: 1 });
PayoutSchema.index({ scheduledAt: 1 });
