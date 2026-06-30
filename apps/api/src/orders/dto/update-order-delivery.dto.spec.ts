import { BadRequestException } from '@nestjs/common';
import { DeliveryType } from './create-order.dto';
import {
  UpdateOrderDeliveryDto,
  validateUpdateOrderDeliveryDto,
} from './update-order-delivery.dto';

describe('UpdateOrderDeliveryDto validation', () => {
  const validDto = (): UpdateOrderDeliveryDto => ({
    recipientName: ' Updated User ',
    recipientPhone: '+380991111111',
    cityRef: 'city-ref',
    cityName: ' Kyiv ',
    warehouseRef: 'warehouse-ref',
    warehouseName: ' Warehouse 7 ',
    deliveryType: DeliveryType.Postomat,
  });

  it('normalizes and returns valid delivery updates', () => {
    expect(validateUpdateOrderDeliveryDto(validDto())).toEqual({
      recipientName: 'Updated User',
      recipientPhone: '+380991111111',
      cityRef: 'city-ref',
      cityName: 'Kyiv',
      warehouseRef: 'warehouse-ref',
      warehouseName: 'Warehouse 7',
      deliveryType: DeliveryType.Postomat,
    });
  });

  it('rejects missing delivery data', () => {
    expect(() =>
      validateUpdateOrderDeliveryDto({
        ...validDto(),
        cityRef: '',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validateUpdateOrderDeliveryDto({
        ...validDto(),
        warehouseName: ' ',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid phones and delivery types', () => {
    expect(() =>
      validateUpdateOrderDeliveryDto({
        ...validDto(),
        recipientPhone: 'telegram-only',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validateUpdateOrderDeliveryDto({
        ...validDto(),
        deliveryType: 'drone' as DeliveryType,
      }),
    ).toThrow(BadRequestException);
  });
});
