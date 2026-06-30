import { BadRequestException } from '@nestjs/common';
import { validateUpdateWishlistItemDto, UpdateWishlistItemDto } from './update-wishlist-item.dto';
import { WishlistItemStatus } from '../schemas/wishlist-item.schema';

describe('UpdateWishlistItemDto validation', () => {
  it('keeps valid status and boolean notification flags', () => {
    expect(
      validateUpdateWishlistItemDto({
        status: WishlistItemStatus.Archived,
        notifyLowStock: false,
        notifySecondChance: true,
      }),
    ).toEqual({
      status: WishlistItemStatus.Archived,
      notifyLowStock: false,
      notifySecondChance: true,
    });
  });

  it('ignores non-boolean notification values', () => {
    expect(
      validateUpdateWishlistItemDto({
        notifyLowStock: 'yes',
        notifySecondChance: 1,
      } as unknown as UpdateWishlistItemDto),
    ).toEqual({
      notifyLowStock: undefined,
      notifySecondChance: undefined,
    });
  });

  it('rejects invalid status values', () => {
    expect(() =>
      validateUpdateWishlistItemDto({
        status: 'deleted',
      } as unknown as UpdateWishlistItemDto),
    ).toThrow(BadRequestException);
  });
});
