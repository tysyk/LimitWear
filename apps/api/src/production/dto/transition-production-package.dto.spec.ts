import { BadRequestException } from '@nestjs/common';
import {
  TransitionProductionPackageDto,
  validateTransitionProductionPackageDto,
} from './transition-production-package.dto';
import { ProductionPackageStatus } from '../schemas/production-package.schema';

describe('validateTransitionProductionPackageDto', () => {
  it('normalizes valid transition input', () => {
    expect(
      validateTransitionProductionPackageDto({
        status: ProductionPackageStatus.SentToProducer,
        notes: ' Sent to producer ',
      }),
    ).toEqual({
      status: ProductionPackageStatus.SentToProducer,
      notes: 'Sent to producer',
    });
  });

  it('rejects invalid production package statuses', () => {
    expect(() =>
      validateTransitionProductionPackageDto({
        status: 'unknown' as TransitionProductionPackageDto['status'],
      }),
    ).toThrow(BadRequestException);
  });
});
