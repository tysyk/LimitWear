import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { UserRole } from '@limitwear/shared';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

export enum AuditActorType {
  Admin = 'admin',
  System = 'system',
  User = 'user',
  Webhook = 'webhook',
}

export interface AuditActor {
  type: AuditActorType;
  id?: MongooseSchema.Types.ObjectId | string;
  email?: string;
  role?: UserRole;
}

export interface AuditEntity {
  type: string;
  id?: MongooseSchema.Types.ObjectId | string;
  slug?: string;
}

@Schema({
  collection: 'audit_logs',
  timestamps: {
    createdAt: true,
    updatedAt: false,
  },
  versionKey: false,
})
export class AuditLog {
  @Prop(
    raw({
      type: {
        type: String,
        enum: Object.values(AuditActorType),
        required: true,
      },
      id: {
        type: MongooseSchema.Types.ObjectId,
        ref: 'User',
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      role: {
        type: String,
        enum: Object.values(UserRole),
      },
    }),
  )
  actor!: AuditActor;

  @Prop({
    required: true,
    trim: true,
  })
  action!: string;

  @Prop(
    raw({
      type: {
        type: String,
        required: true,
        trim: true,
      },
      id: {
        type: MongooseSchema.Types.ObjectId,
      },
      slug: {
        type: String,
        trim: true,
        lowercase: true,
      },
    }),
  )
  entity!: AuditEntity;

  @Prop({
    type: MongooseSchema.Types.Mixed,
  })
  old?: Record<string, unknown>;

  @Prop({
    type: MongooseSchema.Types.Mixed,
  })
  new?: Record<string, unknown>;

  @Prop({
    trim: true,
  })
  reason?: string;

  @Prop({
    trim: true,
  })
  ip?: string;

  @Prop({
    trim: true,
  })
  userAgent?: string;

  createdAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ 'actor.id': 1, createdAt: -1 });
AuditLogSchema.index({ 'entity.type': 1, 'entity.id': 1, createdAt: -1 });
