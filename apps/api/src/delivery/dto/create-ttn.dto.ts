import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTtnDto {
  @ApiProperty({ example: 1 })
  weight!: number;

  @ApiProperty({ example: 1 })
  seatsAmount!: number;

  @ApiProperty({ example: 'LimitWear order' })
  description!: string;

  @ApiProperty({ example: 2200 })
  cost!: number;
}

export function validateCreateTtnDto(dto: CreateTtnDto): CreateTtnDto {
  if (!Number.isFinite(dto.weight) || dto.weight <= 0) {
    throw new BadRequestException('Weight must be greater than zero.');
  }
  if (!Number.isInteger(dto.seatsAmount) || dto.seatsAmount < 1) {
    throw new BadRequestException('Seats amount must be a positive integer.');
  }
  if (!dto.description?.trim()) {
    throw new BadRequestException('Description is required.');
  }
  if (!Number.isFinite(dto.cost) || dto.cost <= 0) {
    throw new BadRequestException('Cost must be greater than zero.');
  }

  return {
    weight: dto.weight,
    seatsAmount: dto.seatsAmount,
    description: dto.description.trim(),
    cost: dto.cost,
  };
}
