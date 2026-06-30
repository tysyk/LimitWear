import {
  SecondChanceListing,
  SecondChanceListingSchema,
  SecondChanceListingStatus,
} from './second-chance-listing.schema';

describe('SecondChanceListingSchema', () => {
  it('uses the second_chance_listings collection with timestamps', () => {
    expect(SecondChanceListingSchema.get('collection')).toBe('second_chance_listings');
    expect(SecondChanceListingSchema.get('timestamps')).toBe(true);
  });

  it('defines baseline second chance listing fields and defaults', () => {
    expect(SecondChanceListingSchema.path('dropId').options.required).toBe(true);
    expect(SecondChanceListingSchema.path('sourceOrderId')).toBeDefined();
    expect(SecondChanceListingSchema.path('size').options.required).toBe(true);
    expect(SecondChanceListingSchema.path('quantity').options.required).toBe(true);
    expect(SecondChanceListingSchema.path('quantity').options.default).toBe(1);
    expect(SecondChanceListingSchema.path('price').options.required).toBe(true);
    expect(SecondChanceListingSchema.path('currency').options.default).toBe('UAH');
    expect(SecondChanceListingSchema.path('currency').options.uppercase).toBe(true);
    expect(SecondChanceListingSchema.path('status').options.enum).toEqual(
      Object.values(SecondChanceListingStatus),
    );
    expect(SecondChanceListingSchema.path('status').options.default).toBe(
      SecondChanceListingStatus.Draft,
    );
    expect(SecondChanceListingSchema.path('priorityWindowUntil')).toBeDefined();
    expect(SecondChanceListingSchema.path('publicAvailableAt')).toBeDefined();
    expect(SecondChanceListingSchema.path('soldAt')).toBeDefined();
  });

  it('indexes drop listings, source orders, and availability windows', () => {
    expect(SecondChanceListingSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ dropId: 1, status: 1 }, expect.any(Object)],
        [{ sourceOrderId: 1 }, expect.any(Object)],
        [{ status: 1, priorityWindowUntil: 1 }, expect.any(Object)],
        [{ status: 1, publicAvailableAt: 1 }, expect.any(Object)],
      ]),
    );
  });

  it('exposes the SecondChanceListing class for Mongoose registration', () => {
    expect(SecondChanceListing.name).toBe('SecondChanceListing');
  });
});
