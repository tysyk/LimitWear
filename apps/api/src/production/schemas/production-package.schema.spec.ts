import {
  ProductionPackage,
  ProductionPackageSchema,
  ProductionPackageStatus,
} from './production-package.schema';

describe('ProductionPackageSchema', () => {
  it('uses the production_packages collection with timestamps', () => {
    expect(ProductionPackageSchema.get('collection')).toBe('production_packages');
    expect(ProductionPackageSchema.get('timestamps')).toBe(true);
  });

  it('defines baseline production package fields', () => {
    expect(ProductionPackageSchema.path('dropId').options.required).toBe(true);
    expect(ProductionPackageSchema.path('designId').options.required).toBe(true);
    expect(ProductionPackageSchema.path('status').options.enum).toEqual(
      Object.values(ProductionPackageStatus),
    );
    expect(ProductionPackageSchema.path('status').options.default).toBe(
      ProductionPackageStatus.ReadyForProduction,
    );
    expect(ProductionPackageSchema.path('productType').options.required).toBe(true);
    expect(ProductionPackageSchema.path('productColor')).toBeDefined();
    expect(ProductionPackageSchema.path('material')).toBeDefined();
    expect(ProductionPackageSchema.path('totalQuantity').options.required).toBe(true);
    expect(ProductionPackageSchema.path('sizeBreakdown')).toBeDefined();
    expect(ProductionPackageSchema.path('productionFileIds')).toBeDefined();
    expect(ProductionPackageSchema.path('mockupIds')).toBeDefined();
    expect(ProductionPackageSchema.path('orderIds')).toBeDefined();
    expect(ProductionPackageSchema.path('notes')).toBeDefined();
    expect(ProductionPackageSchema.path('sentToProducerAt')).toBeDefined();
    expect(ProductionPackageSchema.path('completedAt')).toBeDefined();
    expect(ProductionPackageSchema.path('readyToShipAt')).toBeDefined();
    expect(ProductionPackageSchema.path('createdByAdminId')).toBeDefined();
  });

  it('indexes production package operational lookups', () => {
    expect(ProductionPackageSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ dropId: 1 }, { unique: true }],
        [{ status: 1 }, expect.any(Object)],
        [{ createdAt: -1 }, expect.any(Object)],
        [{ orderIds: 1 }, expect.any(Object)],
      ]),
    );
  });

  it('exposes the ProductionPackage class for Mongoose registration', () => {
    expect(ProductionPackage.name).toBe('ProductionPackage');
  });
});
