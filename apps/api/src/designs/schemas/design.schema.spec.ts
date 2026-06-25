import { Design, DesignSchema, DesignStatus } from './design.schema';

describe('DesignSchema', () => {
  it('uses the designs collection with timestamps', () => {
    expect(DesignSchema.get('collection')).toBe('designs');
    expect(DesignSchema.get('timestamps')).toBe(true);
  });

  it('defines baseline design fields and defaults', () => {
    expect(DesignSchema.path('designerId')).toBeDefined();
    expect(DesignSchema.path('createdByUserId').options.required).toBe(true);
    expect(DesignSchema.path('title').options.required).toBe(true);
    expect(DesignSchema.path('slug').options.unique).toBe(true);
    expect(DesignSchema.path('slug').options.sparse).toBe(true);
    expect(DesignSchema.path('slug').options.lowercase).toBe(true);
    expect(DesignSchema.path('description')).toBeDefined();
    expect(DesignSchema.path('status').options.enum).toEqual(Object.values(DesignStatus));
    expect(DesignSchema.path('status').options.default).toBe(DesignStatus.Draft);
    expect(DesignSchema.path('mainFileId')).toBeDefined();
    expect(DesignSchema.path('previewImageIds').options.default).toEqual([]);
    expect(DesignSchema.path('mockupImageIds').options.default).toEqual([]);
    expect(DesignSchema.path('productionFileIds').options.default).toEqual([]);
    expect(DesignSchema.path('category')).toBeDefined();
    expect(DesignSchema.path('tags').options.default).toEqual([]);
    expect(DesignSchema.path('adminComment')).toBeDefined();
    expect(DesignSchema.path('rejectionReason')).toBeDefined();
    expect(DesignSchema.path('submittedAt')).toBeDefined();
    expect(DesignSchema.path('approvedAt')).toBeDefined();
    expect(DesignSchema.path('approvedBy')).toBeDefined();
  });

  it('indexes designer and review queries', () => {
    expect(DesignSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ slug: 1 }, expect.objectContaining({ sparse: true, unique: true })],
        [{ designerId: 1 }, expect.any(Object)],
        [{ createdByUserId: 1 }, expect.any(Object)],
        [{ status: 1 }, expect.any(Object)],
        [{ title: 'text', tags: 'text' }, expect.any(Object)],
      ]),
    );
  });

  it('exposes the Design class for Mongoose registration', () => {
    expect(Design.name).toBe('Design');
  });
});
