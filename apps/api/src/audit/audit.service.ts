import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserRole } from '@limitwear/shared';
import { Model } from 'mongoose';
import {
  AuditActor,
  AuditActorType,
  AuditEntity,
  AuditLog,
  AuditLogDocument,
} from './schemas/audit-log.schema';

export interface AuditRequestContext {
  ip?: string;
  userAgent?: string;
}

export interface CreateAuditLogInput {
  actor: AuditActor;
  action: string;
  entity: AuditEntity;
  old?: Record<string, unknown>;
  new?: Record<string, unknown>;
  reason?: string;
  request?: AuditRequestContext;
}

export interface ActorUserInput {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuditActionInput {
  action: string;
  entity: AuditEntity;
  old?: Record<string, unknown>;
  new?: Record<string, unknown>;
  reason?: string;
  request?: AuditRequestContext;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async create(input: CreateAuditLogInput): Promise<AuditLogDocument> {
    return this.auditLogModel.create({
      actor: input.actor,
      action: input.action,
      entity: input.entity,
      old: input.old,
      new: input.new,
      reason: input.reason,
      ip: input.request?.ip,
      userAgent: input.request?.userAgent,
    });
  }

  async recordAdminAction(
    actor: ActorUserInput,
    input: AuditActionInput,
  ): Promise<AuditLogDocument> {
    return this.create({
      ...input,
      actor: {
        type: AuditActorType.Admin,
        id: actor.id,
        email: actor.email,
        role: actor.role,
      },
    });
  }

  async recordSystemAction(input: AuditActionInput): Promise<AuditLogDocument> {
    return this.create({
      ...input,
      actor: {
        type: AuditActorType.System,
      },
    });
  }

  async recordWebhookAction(input: AuditActionInput): Promise<AuditLogDocument> {
    return this.create({
      ...input,
      actor: {
        type: AuditActorType.Webhook,
      },
    });
  }
}
