import { BadRequestException } from '@nestjs/common';

export class MarkPayoutPaidDto {
  amount?: number;
  notes?: string;
}

export interface ValidatedMarkPayoutPaidDto {
  amount?: number;
  notes?: string;
}

export function validateMarkPayoutPaidDto(dto: MarkPayoutPaidDto): ValidatedMarkPayoutPaidDto {
  if (dto.amount !== undefined && (!Number.isFinite(dto.amount) || dto.amount <= 0)) {
    throw new BadRequestException('Paid amount must be a positive number.');
  }

  return {
    amount: dto.amount,
    notes: dto.notes?.trim(),
  };
}
