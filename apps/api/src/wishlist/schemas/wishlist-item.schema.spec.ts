import { WishlistItem, WishlistItemSchema, WishlistItemStatus } from './wishlist-item.schema';

describe('WishlistItemSchema', () => {
  it('uses the wishlist_items collection with timestamps', () => {
    expect(WishlistItemSchema.get('collection')).toBe('wishlist_items');
    expect(WishlistItemSchema.get('timestamps')).toBe(true);
  });

  it('defines baseline wishlist fields and defaults', () => {
    expect(WishlistItemSchema.path('userId').options.required).toBe(true);
    expect(WishlistItemSchema.path('dropId').options.required).toBe(true);
    expect(WishlistItemSchema.path('status').options.enum).toEqual(
      Object.values(WishlistItemStatus),
    );
    expect(WishlistItemSchema.path('status').options.default).toBe(WishlistItemStatus.Active);
    expect(WishlistItemSchema.path('notifyLowStock').options.default).toBe(true);
    expect(WishlistItemSchema.path('notifySecondChance').options.default).toBe(true);
    expect(WishlistItemSchema.path('lowStockNotifiedAt')).toBeDefined();
  });

  it('indexes wishlist ownership and notification queues', () => {
    expect(WishlistItemSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ userId: 1, dropId: 1 }, expect.objectContaining({ unique: true })],
        [{ userId: 1, status: 1 }, expect.any(Object)],
        [{ dropId: 1, status: 1, notifyLowStock: 1, lowStockNotifiedAt: 1 }, expect.any(Object)],
        [{ dropId: 1, status: 1, notifySecondChance: 1 }, expect.any(Object)],
      ]),
    );
  });

  it('exposes the WishlistItem class for Mongoose registration', () => {
    expect(WishlistItem.name).toBe('WishlistItem');
  });
});
