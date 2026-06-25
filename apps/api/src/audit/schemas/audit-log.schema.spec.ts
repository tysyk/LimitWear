import { UserRole } from '@limitwear/shared';
import { AuditActorType, AuditLog, AuditLogSchema } from './audit-log.schema';

describe('AuditLogSchema', () => {
  it('uses the audit_logs collection with createdAt timestamps only', () => {
    expect(AuditLogSchema.get('collection')).toBe('audit_logs');
    expect(AuditLogSchema.get('timestamps')).toEqual({
      createdAt: true,
      updatedAt: false,
    });
  });

  it('defines baseline audit log fields', () => {
    expect(AuditLogSchema.path('actor.type').options.enum).toEqual(Object.values(AuditActorType));
    expect(AuditLogSchema.path('actor.id')).toBeDefined();
    expect(AuditLogSchema.path('actor.email')).toBeDefined();
    expect(AuditLogSchema.path('actor.role').options.enum).toEqual(Object.values(UserRole));
    expect(AuditLogSchema.path('action').options.required).toBe(true);
    expect(AuditLogSchema.path('entity.type').options.required).toBe(true);
    expect(AuditLogSchema.path('entity.id')).toBeDefined();
    expect(AuditLogSchema.path('entity.slug')).toBeDefined();
    expect(AuditLogSchema.path('old')).toBeDefined();
    expect(AuditLogSchema.path('new')).toBeDefined();
    expect(AuditLogSchema.path('reason')).toBeDefined();
    expect(AuditLogSchema.path('ip')).toBeDefined();
    expect(AuditLogSchema.path('userAgent')).toBeDefined();
  });

  it('indexes common audit log queries', () => {
    expect(AuditLogSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ createdAt: -1 }, expect.any(Object)],
        [
          {
            action: 1,
            createdAt: -1,
          },
          expect.any(Object),
        ],
        [
          {
            'actor.id': 1,
            createdAt: -1,
          },
          expect.any(Object),
        ],
        [
          {
            'entity.type': 1,
            'entity.id': 1,
            createdAt: -1,
          },
          expect.any(Object),
        ],
      ]),
    );
  });

  it('exposes the AuditLog class for Mongoose registration', () => {
    expect(AuditLog.name).toBe('AuditLog');
  });
});
