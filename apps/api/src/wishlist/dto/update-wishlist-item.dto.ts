import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { WishlistItemStatus } from '../schemas/wishlist-item.schema';

export class UpdateWishlistItemDto {
  @ApiProperty({ enum: WishlistItemStatus, required: false, example: WishlistItemStatus.Active })
  status?: WishlistItemStatus;

  @ApiProperty({ required: false, example: true })
  notifyLowStock?: boolean;

  @ApiProperty({ required: false, example: true })
  notifySecondChance?: boolean;
}

export interface ValidatedWishlistItemSettingsInput {
  status?: WishlistItemStatus;
  notifyLowStock?: boolean;
  notifySecondChance?: boolean;
}

export function validateUpdateWishlistItemDto(
  dto: UpdateWishlistItemDto,
): ValidatedWishlistItemSettingsInput {
  if (dto.status !== undefined && !Object.values(WishlistItemStatus).includes(dto.status)) {
    throw new BadRequestException('Wishlist status is invalid.');
  }

  return {
    status: dto.status,
    notifyLowStock: normalizeOptionalBoolean(dto.notifyLowStock),
    notifySecondChance: normalizeOptionalBoolean(dto.notifySecondChance),
  };
}

function normalizeOptionalBoolean(value: boolean | undefined): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}
