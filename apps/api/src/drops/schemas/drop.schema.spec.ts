import { DropStatus } from '@limitwear/shared';
import { Drop, DropSchema, ProductType } from './drop.schema';

describe('DropSchema', () => {
  it('uses the drops collection with timestamps', () => {
    expect(DropSchema.get('collection')).toBe('drops');
    expect(DropSchema.get('timestamps')).toBe(true);
  });

  it('defines baseline drop fields and defaults', () => {
    expect(DropSchema.path('dropNumber').options.required).toBe(true);
    expect(DropSchema.path('dropNumber').options.unique).toBe(true);
    expect(DropSchema.path('designId').options.required).toBe(true);
    expect(DropSchema.path('designerId')).toBeDefined();
    expect(DropSchema.path('collectionId')).toBeDefined();
    expect(DropSchema.path('title').options.required).toBe(true);
    expect(DropSchema.path('slug').options.unique).toBe(true);
    expect(DropSchema.path('slug').options.lowercase).toBe(true);
    expect(DropSchema.path('description')).toBeDefined();
    expect(DropSchema.path('productType').options.enum).toEqual(Object.values(ProductType));
    expect(DropSchema.path('productColor')).toBeDefined();
    expect(DropSchema.path('productBase')).toBeDefined();
    expect(DropSchema.path('material')).toBeDefined();
    expect(DropSchema.path('price').options.min).toBe(0);
    expect(DropSchema.path('currency').options.default).toBe('UAH');
    expect(DropSchema.path('designerRevenuePercent').options.min).toBe(0);
    expect(DropSchema.path('designerRevenuePercent').options.max).toBe(100);
    expect(DropSchema.path('minQuantity').options.min).toBe(1);
    expect(DropSchema.path('maxQuantity').options.min).toBe(1);
    expect(DropSchema.path('currentQuantity').options.default).toBe(0);
    expect(DropSchema.path('finalQuantity')).toBeDefined();
    expect(DropSchema.path('sizeOptions').options.default).toEqual([]);
    expect(DropSchema.path('sizeBreakdown').options.default).toEqual({});
    expect(DropSchema.path('status').options.enum).toEqual(Object.values(DropStatus));
    expect(DropSchema.path('status').options.default).toBe(DropStatus.Draft);
    expect(DropSchema.path('startsAt')).toBeDefined();
    expect(DropSchema.path('endsAt')).toBeDefined();
    expect(DropSchema.path('completedAt')).toBeDefined();
    expect(DropSchema.path('failedAt')).toBeDefined();
    expect(DropSchema.path('foreverClosedAt')).toBeDefined();
    expect(DropSchema.path('mainImageId')).toBeDefined();
    expect(DropSchema.path('imageIds').options.default).toEqual([]);
    expect(DropSchema.path('createdByAdminId')).toBeDefined();
    expect(DropSchema.path('approvedByAdminId')).toBeDefined();
  });

  it('indexes public catalog queries', () => {
    expect(DropSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ slug: 1 }, expect.objectContaining({ unique: true })],
        [{ dropNumber: 1 }, expect.objectContaining({ unique: true })],
        [{ status: 1 }, expect.any(Object)],
        [{ startsAt: 1 }, expect.any(Object)],
        [{ endsAt: 1 }, expect.any(Object)],
        [{ collectionId: 1 }, expect.any(Object)],
        [{ designerId: 1 }, expect.any(Object)],
        [{ status: 1, startsAt: 1, endsAt: 1 }, expect.any(Object)],
      ]),
    );
  });

  it('exposes the Drop class for Mongoose registration', () => {
    expect(Drop.name).toBe('Drop');
  });
});
