import { UserRole } from '@limitwear/shared';
import { Model } from 'mongoose';
import { AuditService } from './audit.service';
import { AuditActorType, AuditLogDocument } from './schemas/audit-log.schema';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogModel: {
    create: jest.Mock;
  };

  beforeEach(() => {
    auditLogModel = {
      create: jest.fn(),
    };
    service = new AuditService(auditLogModel as unknown as Model<AuditLogDocument>);
  });

  it('creates an audit log with request metadata', async () => {
    const createdAuditLog = { id: 'audit-log-id' } as AuditLogDocument;
    auditLogModel.create.mockResolvedValue(createdAuditLog);

    await expect(
      service.create({
        actor: {
          type: AuditActorType.User,
          id: 'user-id',
          email: 'user@example.com',
          role: UserRole.User,
        },
        action: 'profile.update',
        entity: {
          type: 'user',
          id: 'user-id',
        },
        old: {
          firstName: 'Old',
        },
        new: {
          firstName: 'New',
        },
        reason: 'User updated profile',
        request: {
          ip: '127.0.0.1',
          userAgent: 'jest',
        },
      }),
    ).resolves.toBe(createdAuditLog);

    expect(auditLogModel.create).toHaveBeenCalledWith({
      actor: {
        type: AuditActorType.User,
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.User,
      },
      action: 'profile.update',
      entity: {
        type: 'user',
        id: 'user-id',
      },
      old: {
        firstName: 'Old',
      },
      new: {
        firstName: 'New',
      },
      reason: 'User updated profile',
      ip: '127.0.0.1',
      userAgent: 'jest',
    });
  });

  it('records admin actions with actor details', async () => {
    const createdAuditLog = { id: 'audit-log-id' } as AuditLogDocument;
    auditLogModel.create.mockResolvedValue(createdAuditLog);

    await service.recordAdminAction(
      {
        id: 'admin-id',
        email: 'admin@example.com',
        role: UserRole.Admin,
      },
      {
        action: 'request.approve',
        entity: {
          type: 'request',
          id: 'request-id',
        },
      },
    );

    expect(auditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: {
          type: AuditActorType.Admin,
          id: 'admin-id',
          email: 'admin@example.com',
          role: UserRole.Admin,
        },
      }),
    );
  });

  it('records system actions', async () => {
    const createdAuditLog = { id: 'audit-log-id' } as AuditLogDocument;
    auditLogModel.create.mockResolvedValue(createdAuditLog);

    await service.recordSystemAction({
      action: 'drop.expire',
      entity: {
        type: 'drop',
        id: 'drop-id',
      },
    });

    expect(auditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: {
          type: AuditActorType.System,
        },
      }),
    );
  });

  it('records webhook actions', async () => {
    const createdAuditLog = { id: 'audit-log-id' } as AuditLogDocument;
    auditLogModel.create.mockResolvedValue(createdAuditLog);

    await service.recordWebhookAction({
      action: 'payment.confirm',
      entity: {
        type: 'payment',
        id: 'payment-id',
      },
    });

    expect(auditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: {
          type: AuditActorType.Webhook,
        },
      }),
    );
  });
});
