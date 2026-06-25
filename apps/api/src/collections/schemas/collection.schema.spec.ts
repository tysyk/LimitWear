import { Collection, CollectionSchema, CollectionStatus } from './collection.schema';

describe('CollectionSchema', () => {
  it('uses the collections collection with timestamps', () => {
    expect(CollectionSchema.get('collection')).toBe('collections');
    expect(CollectionSchema.get('timestamps')).toBe(true);
  });

  it('defines baseline collection fields and defaults', () => {
    expect(CollectionSchema.path('title').options.required).toBe(true);
    expect(CollectionSchema.path('slug').options.unique).toBe(true);
    expect(CollectionSchema.path('slug').options.lowercase).toBe(true);
    expect(CollectionSchema.path('description')).toBeDefined();
    expect(CollectionSchema.path('dropIds').options.default).toEqual([]);
    expect(CollectionSchema.path('primaryDesignerId')).toBeDefined();
    expect(CollectionSchema.path('designerIds').options.default).toEqual([]);
    expect(CollectionSchema.path('status').options.enum).toEqual(Object.values(CollectionStatus));
    expect(CollectionSchema.path('status').options.default).toBe(CollectionStatus.Draft);
    expect(CollectionSchema.path('coverImageId')).toBeDefined();
    expect(CollectionSchema.path('featured').options.default).toBe(false);
    expect(CollectionSchema.path('createdByUserId').options.required).toBe(true);
    expect(CollectionSchema.path('approvedByAdminId')).toBeDefined();
    expect(CollectionSchema.path('publishedAt')).toBeDefined();
  });

  it('indexes public collection queries', () => {
    expect(CollectionSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ slug: 1 }, expect.objectContaining({ unique: true })],
        [{ status: 1 }, expect.any(Object)],
        [{ featured: 1 }, expect.any(Object)],
        [{ designerIds: 1 }, expect.any(Object)],
        [{ status: 1, featured: 1 }, expect.any(Object)],
      ]),
    );
  });

  it('exposes the Collection class for Mongoose registration', () => {
    expect(Collection.name).toBe('Collection');
  });
});
