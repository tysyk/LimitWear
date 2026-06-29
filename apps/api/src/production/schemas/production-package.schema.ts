import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ProductionPackageDocument = HydratedDocument<ProductionPackage>;

export enum ProductionPackageStatus {
  Draft = 'draft',
  ReadyForProduction = 'ready_for_production',
  SentToProducer = 'sent_to_producer',
  InProduction = 'in_production',
  Completed = 'completed',
  ReadyToShip = 'ready_to_ship',
  Problem = 'problem',
  Cancelled = 'cancelled',
}

@Schema({
  collection: 'production_packages',
  timestamps: true,
})
export class ProductionPackage {
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
    type: String,
    enum: Object.values(ProductionPackageStatus),
    default: ProductionPackageStatus.ReadyForProduction,
    required: true,
  })
  status!: ProductionPackageStatus;

  @Prop({
    required: true,
    trim: true,
  })
  productType!: string;

  @Prop({
    trim: true,
  })
  productColor?: string;

  @Prop({
    trim: true,
  })
  material?: string;

  @Prop({
    required: true,
    min: 0,
  })
  totalQuantity!: number;

  @Prop({
    type: Map,
    of: Number,
    default: {},
  })
  sizeBreakdown!: Record<string, number>;

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    default: [],
  })
  productionFileIds!: Types.ObjectId[];

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    default: [],
  })
  mockupIds!: Types.ObjectId[];

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    default: [],
  })
  orderIds!: Types.ObjectId[];

  @Prop({
    trim: true,
  })
  notes?: string;

  @Prop()
  sentToProducerAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  readyToShipAt?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  createdByAdminId?: Types.ObjectId;
}

export const ProductionPackageSchema = SchemaFactory.createForClass(ProductionPackage);

ProductionPackageSchema.index({ dropId: 1 }, { unique: true });
ProductionPackageSchema.index({ status: 1 });
ProductionPackageSchema.index({ createdAt: -1 });
ProductionPackageSchema.index({ orderIds: 1 });
