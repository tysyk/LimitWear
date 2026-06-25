import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { RequestStatus } from '@limitwear/shared';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type RequestDocument = HydratedDocument<Request>;

export enum RequestType {
  DesignerApplication = 'designer_application',
  DesignReview = 'design_review',
  DropProposal = 'drop_proposal',
  CollectionProposal = 'collection_proposal',
  ReturnRequest = 'return_request',
  OrderProblem = 'order_problem',
  ProductionTask = 'production_task',
  SecondChanceTask = 'second_chance_task',
}

export enum RequestPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Critical = 'critical',
}

@Schema({
  collection: 'requests',
  timestamps: true,
})
export class Request {
  @Prop({
    type: String,
    enum: Object.values(RequestType),
    required: true,
  })
  type!: RequestType;

  @Prop({
    type: String,
    enum: Object.values(RequestStatus),
    default: RequestStatus.Submitted,
    required: true,
  })
  status!: RequestStatus;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdByUserId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  assignedToAdminId?: Types.ObjectId;

  @Prop({
    trim: true,
  })
  targetEntityType?: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
  })
  targetEntityId?: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    trim: true,
  })
  message?: string;

  @Prop({
    type: MongooseSchema.Types.Mixed,
  })
  payload?: Record<string, unknown>;

  @Prop({
    trim: true,
  })
  adminComment?: string;

  @Prop({
    type: [MongooseSchema.Types.ObjectId],
    default: [],
  })
  fileIds!: Types.ObjectId[];

  @Prop({
    type: String,
    enum: Object.values(RequestPriority),
    default: RequestPriority.Normal,
    required: true,
  })
  priority!: RequestPriority;

  @Prop()
  resolvedAt?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  resolvedBy?: Types.ObjectId;
}

export const RequestSchema = SchemaFactory.createForClass(Request);

RequestSchema.index({ type: 1, status: 1 });
RequestSchema.index({ status: 1, priority: 1 });
RequestSchema.index({ createdByUserId: 1, createdAt: -1 });
RequestSchema.index({ assignedToAdminId: 1, status: 1 });
RequestSchema.index({ targetEntityType: 1, targetEntityId: 1 });
