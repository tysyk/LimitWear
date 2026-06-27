import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateOrderDto, DeliveryType, validateCreateOrderDto } from './create-order.dto';

describe('CreateOrderDto validation', () => {
  const validDto = (): CreateOrderDto => ({
    dropId: new Types.ObjectId().toHexString(),
    size: ' M ',
    quantity: 1,
    recipientName: ' Олег Тисик ',
    recipientPhone: '+380991234567',
    cityRef: 'city-ref',
    cityName: ' Львів ',
    warehouseRef: 'warehouse-ref',
    warehouseName: ' Відділення №1 ',
    deliveryType: DeliveryType.Warehouse,
  });

  it('normalizes and returns valid order input', () => {
    expect(validateCreateOrderDto(validDto())).toEqual(
      expect.objectContaining({
        size: 'M',
        quantity: 1,
        recipientName: 'Олег Тисик',
        recipientPhone: '+380991234567',
        cityRef: 'city-ref',
        cityName: 'Львів',
        warehouseRef: 'warehouse-ref',
        warehouseName: 'Відділення №1',
        deliveryType: DeliveryType.Warehouse,
      }),
    );
  });

  it('rejects invalid drop ids', () => {
    expect(() =>
      validateCreateOrderDto({
        ...validDto(),
        dropId: 'not-object-id',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid size values', () => {
    expect(() =>
      validateCreateOrderDto({
        ...validDto(),
        size: ' ',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validateCreateOrderDto({
        ...validDto(),
        size: 'M.$inc',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid quantities', () => {
    expect(() =>
      validateCreateOrderDto({
        ...validDto(),
        quantity: 0,
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validateCreateOrderDto({
        ...validDto(),
        quantity: 1.5,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects missing delivery data', () => {
    expect(() =>
      validateCreateOrderDto({
        ...validDto(),
        cityRef: '',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validateCreateOrderDto({
        ...validDto(),
        warehouseName: ' ',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid recipient phones', () => {
    expect(() =>
      validateCreateOrderDto({
        ...validDto(),
        recipientPhone: 'telegram-only',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects invalid delivery types', () => {
    expect(() =>
      validateCreateOrderDto({
        ...validDto(),
        deliveryType: 'drone' as DeliveryType,
      }),
    ).toThrow(BadRequestException);
  });
});
