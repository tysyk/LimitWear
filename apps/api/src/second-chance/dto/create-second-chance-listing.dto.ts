import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSecondChanceListingDto {
  @ApiProperty({ example: '6674b275c08ff9a9c9a4b001' })
  dropId!: string;

  @ApiProperty({ required: false, example: '6674b275c08ff9a9c9a4b002' })
  sourceOrderId?: string;

  @ApiProperty({ example: 'M' })
  size!: string;

  @ApiProperty({ required: false, example: 1 })
  quantity?: number;

  @ApiProperty({ example: 2200 })
  price!: number;

  @ApiProperty({ required: false, example: 'UAH' })
  currency?: string;

  @ApiProperty({ required: false, example: '2026-07-01T10:00:00.000Z' })
  priorityWindowUntil?: string;

  @ApiProperty({ required: false, example: '2026-07-02T10:00:00.000Z' })
  publicAvailableAt?: string;
}

export interface ValidatedCreateSecondChanceListingInput {
  dropId: string;
  sourceOrderId?: string;
  size: string;
  quantity: number;
  price: number;
  currency: string;
  priorityWindowUntil?: Date;
  publicAvailableAt?: Date;
}

export function validateCreateSecondChanceListingDto(
  dto: CreateSecondChanceListingDto,
): ValidatedCreateSecondChanceListingInput {
  const size = normalizeRequiredString(dto.size, 'Size');
  const quantity = dto.quantity ?? 1;
  const currency = dto.currency?.trim().toUpperCase() || 'UAH';

  if (!dto.dropId?.trim()) {
    throw new BadRequestException('Drop id is required.');
  }
  if (dto.sourceOrderId !== undefined && !dto.sourceOrderId.trim()) {
    throw new BadRequestException('Source order id cannot be empty.');
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new BadRequestException('Quantity must be a positive integer.');
  }
  if (typeof dto.price !== 'number' || dto.price < 0) {
    throw new BadRequestException('Price must be a non-negative number.');
  }
  if (currency.length !== 3) {
    throw new BadRequestException('Currency must be a 3-letter code.');
  }

  return {
    dropId: dto.dropId.trim(),
    sourceOrderId: dto.sourceOrderId?.trim(),
    size,
    quantity,
    price: dto.price,
    currency,
    priorityWindowUntil: parseOptionalDate(dto.priorityWindowUntil, 'Priority window'),
    publicAvailableAt: parseOptionalDate(dto.publicAvailableAt, 'Public availability'),
  };
}

function normalizeRequiredString(value: string | undefined, field: string): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new BadRequestException(`${field} is required.`);
  }

  return normalized;
}

function parseOptionalDate(value: string | undefined, field: string): Date | undefined {
  if (value === undefined) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} date is invalid.`);
  }

  return date;
}
