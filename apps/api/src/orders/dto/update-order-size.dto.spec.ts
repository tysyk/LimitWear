import { BadRequestException } from '@nestjs/common';
import { UpdateOrderSizeDto, validateUpdateOrderSizeDto } from './update-order-size.dto';

describe('UpdateOrderSizeDto validation', () => {
  const validDto = (): UpdateOrderSizeDto => ({
    size: ' L ',
  });

  it('normalizes and returns valid size updates', () => {
    expect(validateUpdateOrderSizeDto(validDto())).toEqual({
      size: 'L',
    });
  });

  it('rejects missing or unsafe size values', () => {
    expect(() =>
      validateUpdateOrderSizeDto({
        size: '',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      validateUpdateOrderSizeDto({
        size: 'M.$inc',
      }),
    ).toThrow(BadRequestException);
  });
});
