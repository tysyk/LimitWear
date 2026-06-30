import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { DeliveryType } from './create-order.dto';

export class UpdateOrderDeliveryDto {
  @ApiProperty({
    example: 'Олег Тисик',
  })
  recipientName!: string;

  @ApiProperty({
    example: '+380991234567',
  })
  recipientPhone!: string;

  @ApiProperty({
    example: '8d5a980d-391c-11dd-90d9-001a92567626',
  })
  cityRef!: string;

  @ApiProperty({
    example: 'Львів',
  })
  cityName!: string;

  @ApiProperty({
    example: '1ec09d60-e1c2-11e3-8c4a-0050568002cf',
  })
  warehouseRef!: string;

  @ApiProperty({
    example: 'Відділення №1',
  })
  warehouseName!: string;

  @ApiProperty({
    enum: DeliveryType,
    example: DeliveryType.Warehouse,
  })
  deliveryType!: DeliveryType;
}

export interface ValidatedUpdateOrderDeliveryInput {
  recipientName: string;
  recipientPhone: string;
  cityRef: string;
  cityName: string;
  warehouseRef: string;
  warehouseName: string;
  deliveryType: DeliveryType;
}

export function validateUpdateOrderDeliveryDto(
  dto: UpdateOrderDeliveryDto,
): ValidatedUpdateOrderDeliveryInput {
  const deliveryType = validateDeliveryType(dto.deliveryType);

  return {
    recipientName: normalizeRequiredText(dto.recipientName, 'Recipient name is required.'),
    recipientPhone: normalizePhone(dto.recipientPhone),
    cityRef: normalizeRequiredText(dto.cityRef, 'City ref is required.'),
    cityName: normalizeRequiredText(dto.cityName, 'City name is required.'),
    warehouseRef: normalizeRequiredText(dto.warehouseRef, 'Warehouse ref is required.'),
    warehouseName: normalizeRequiredText(dto.warehouseName, 'Warehouse name is required.'),
    deliveryType,
  };
}

function validateDeliveryType(deliveryType: DeliveryType): DeliveryType {
  if (!Object.values(DeliveryType).includes(deliveryType)) {
    throw new BadRequestException('Delivery type is invalid.');
  }

  return deliveryType;
}

function normalizeRequiredText(value: string, errorMessage: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new BadRequestException(errorMessage);
  }

  return normalized;
}

function normalizePhone(phone: string): string {
  const normalized = normalizeRequiredText(phone, 'Recipient phone is required.');
  if (!/^\+?\d{10,15}$/.test(normalized)) {
    throw new BadRequestException('Recipient phone is invalid.');
  }

  return normalized;
}
