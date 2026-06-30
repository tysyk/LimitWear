import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderSizeDto {
  @ApiProperty({
    example: 'L',
  })
  size!: string;
}

export interface ValidatedUpdateOrderSizeInput {
  size: string;
}

export function validateUpdateOrderSizeDto(dto: UpdateOrderSizeDto): ValidatedUpdateOrderSizeInput {
  const size = dto.size?.trim();
  if (!size) {
    throw new BadRequestException('Size is required.');
  }

  if (size.includes('.') || size.includes('$')) {
    throw new BadRequestException('Size is invalid.');
  }

  return {
    size,
  };
}
