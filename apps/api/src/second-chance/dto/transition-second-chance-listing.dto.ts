import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { SecondChanceListingStatus } from '../schemas/second-chance-listing.schema';

export class TransitionSecondChanceListingDto {
  @ApiProperty({ enum: SecondChanceListingStatus })
  status!: SecondChanceListingStatus;

  @ApiProperty({ required: false, example: '2026-07-01T10:00:00.000Z' })
  priorityWindowUntil?: string;

  @ApiProperty({ required: false, example: '2026-07-02T10:00:00.000Z' })
  publicAvailableAt?: string;
}

export interface ValidatedTransitionSecondChanceListingInput {
  status: SecondChanceListingStatus;
  priorityWindowUntil?: Date;
  publicAvailableAt?: Date;
}

export function validateTransitionSecondChanceListingDto(
  dto: TransitionSecondChanceListingDto,
): ValidatedTransitionSecondChanceListingInput {
  if (!Object.values(SecondChanceListingStatus).includes(dto.status)) {
    throw new BadRequestException('Second Chance listing status is invalid.');
  }

  return {
    status: dto.status,
    priorityWindowUntil: parseOptionalDate(dto.priorityWindowUntil, 'Priority window'),
    publicAvailableAt: parseOptionalDate(dto.publicAvailableAt, 'Public availability'),
  };
}

function parseOptionalDate(value: string | undefined, field: string): Date | undefined {
  if (value === undefined) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} date is invalid.`);
  }

  return date;
}
