import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { ProductionPackageStatus } from '../schemas/production-package.schema';

export class TransitionProductionPackageDto {
  @ApiProperty({
    enum: ProductionPackageStatus,
    example: ProductionPackageStatus.SentToProducer,
  })
  status!: ProductionPackageStatus;

  @ApiProperty({
    required: false,
    example: 'Sent to local producer on Monday.',
  })
  notes?: string;
}

export interface ValidatedProductionTransitionInput {
  status: ProductionPackageStatus;
  notes?: string;
}

export function validateTransitionProductionPackageDto(
  dto: TransitionProductionPackageDto,
): ValidatedProductionTransitionInput {
  if (!Object.values(ProductionPackageStatus).includes(dto.status)) {
    throw new BadRequestException('Production package status is invalid.');
  }

  return {
    status: dto.status,
    notes: dto.notes?.trim() || undefined,
  };
}
