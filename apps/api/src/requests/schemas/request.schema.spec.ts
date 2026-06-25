import { RequestStatus } from '@limitwear/shared';
import { Request, RequestPriority, RequestSchema, RequestType } from './request.schema';

describe('RequestSchema', () => {
  it('uses the requests collection with timestamps', () => {
    expect(RequestSchema.get('collection')).toBe('requests');
    expect(RequestSchema.get('timestamps')).toBe(true);
  });

  it('defines baseline request fields and defaults', () => {
    expect(RequestSchema.path('type').options.enum).toEqual(Object.values(RequestType));
    expect(RequestSchema.path('type').options.required).toBe(true);
    expect(RequestSchema.path('status').options.enum).toEqual(Object.values(RequestStatus));
    expect(RequestSchema.path('status').options.default).toBe(RequestStatus.Submitted);
    expect(RequestSchema.path('createdByUserId').options.required).toBe(true);
    expect(RequestSchema.path('assignedToAdminId')).toBeDefined();
    expect(RequestSchema.path('targetEntityType')).toBeDefined();
    expect(RequestSchema.path('targetEntityId')).toBeDefined();
    expect(RequestSchema.path('title').options.required).toBe(true);
    expect(RequestSchema.path('message')).toBeDefined();
    expect(RequestSchema.path('adminComment')).toBeDefined();
    expect(RequestSchema.path('fileIds').options.default).toEqual([]);
    expect(RequestSchema.path('priority').options.enum).toEqual(Object.values(RequestPriority));
    expect(RequestSchema.path('priority').options.default).toBe(RequestPriority.Normal);
    expect(RequestSchema.path('resolvedAt')).toBeDefined();
    expect(RequestSchema.path('resolvedBy')).toBeDefined();
  });

  it('indexes request inbox and owner queries', () => {
    expect(RequestSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ type: 1, status: 1 }, expect.any(Object)],
        [{ status: 1, priority: 1 }, expect.any(Object)],
        [{ createdByUserId: 1, createdAt: -1 }, expect.any(Object)],
        [{ assignedToAdminId: 1, status: 1 }, expect.any(Object)],
        [{ targetEntityType: 1, targetEntityId: 1 }, expect.any(Object)],
      ]),
    );
  });

  it('exposes the Request class for Mongoose registration', () => {
    expect(Request.name).toBe('Request');
  });
});
