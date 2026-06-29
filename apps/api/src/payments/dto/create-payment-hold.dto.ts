import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class CreatePaymentHoldDto {
  @ApiProperty({
    example: '6674b275c08ff9a9c9a4b001',
    description: 'Pending payment order id. Amount and user data are always read from backend.',
  })
  orderId!: string;
}

export interface ValidatedCreatePaymentHoldInput {
  orderId: string;
}

export function validateCreatePaymentHoldDto(
  dto: CreatePaymentHoldDto,
): ValidatedCreatePaymentHoldInput {
  if (!dto.orderId || !Types.ObjectId.isValid(dto.orderId)) {
    throw new BadRequestException('Valid orderId is required.');
  }

  return {
    orderId: dto.orderId,
  };
}
