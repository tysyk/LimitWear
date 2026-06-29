import { BadRequestException } from '@nestjs/common';
import { validateCreateTtnDto } from './create-ttn.dto';

describe('validateCreateTtnDto', () => {
  it('normalizes valid TTN input', () => {
    expect(
      validateCreateTtnDto({
        weight: 1,
        seatsAmount: 1,
        description: ' LimitWear order ',
        cost: 2200,
      }),
    ).toEqual({
      weight: 1,
      seatsAmount: 1,
      description: 'LimitWear order',
      cost: 2200,
    });
  });

  it('rejects invalid TTN input', () => {
    expect(() =>
      validateCreateTtnDto({ weight: 0, seatsAmount: 1, description: 'Order', cost: 1 }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateCreateTtnDto({ weight: 1, seatsAmount: 0, description: 'Order', cost: 1 }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateCreateTtnDto({ weight: 1, seatsAmount: 1, description: '', cost: 1 }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateCreateTtnDto({ weight: 1, seatsAmount: 1, description: 'Order', cost: 0 }),
    ).toThrow(BadRequestException);
  });
});
