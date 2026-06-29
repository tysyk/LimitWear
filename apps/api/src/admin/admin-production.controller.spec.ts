import { UserRole, UserStatus } from '@limitwear/shared';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { ProductionService } from '../production/production.service';
import { ProductionPackageStatus } from '../production/schemas/production-package.schema';
import { AdminProductionController } from './admin-production.controller';

describe('AdminProductionController', () => {
  let controller: AdminProductionController;
  let productionService: jest.Mocked<
    Pick<
      ProductionService,
      | 'listProductionPackages'
      | 'getProductionPackage'
      | 'ensurePackageForDrop'
      | 'transitionProductionPackage'
    >
  >;

  const request = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'jest',
    },
    user: {
      id: 'admin-id',
      email: 'admin@example.com',
      role: UserRole.Admin,
      permissions: [],
      status: UserStatus.Active,
      isEmailVerified: false,
      isPhoneVerified: false,
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    productionService = {
      listProductionPackages: jest.fn(),
      getProductionPackage: jest.fn(),
      ensurePackageForDrop: jest.fn(),
      transitionProductionPackage: jest.fn(),
    };
    controller = new AdminProductionController(productionService as unknown as ProductionService);
  });

  it('lists production packages', async () => {
    productionService.listProductionPackages.mockResolvedValue([{ id: 'package-id' }] as never);

    await expect(controller.list()).resolves.toEqual([{ id: 'package-id' }]);
  });

  it('gets production package details', async () => {
    productionService.getProductionPackage.mockResolvedValue({ id: 'package-id' } as never);

    await expect(controller.get('package-id')).resolves.toEqual({ id: 'package-id' });
    expect(productionService.getProductionPackage).toHaveBeenCalledWith('package-id');
  });

  it('ensures a package for a drop with admin context', async () => {
    productionService.ensurePackageForDrop.mockResolvedValue({ id: 'package-id' } as never);

    await expect(controller.ensurePackage('drop-id', request)).resolves.toEqual({
      id: 'package-id',
    });
    expect(productionService.ensurePackageForDrop).toHaveBeenCalledWith(
      'drop-id',
      {
        id: 'admin-id',
        email: 'admin@example.com',
        role: UserRole.Admin,
      },
      {
        ip: '127.0.0.1',
        userAgent: 'jest',
      },
    );
  });

  it('transitions production packages with admin context', async () => {
    productionService.transitionProductionPackage.mockResolvedValue({ id: 'package-id' } as never);
    const dto = {
      status: ProductionPackageStatus.SentToProducer,
      notes: 'Sent',
    };

    await expect(controller.transition('package-id', dto, request)).resolves.toEqual({
      id: 'package-id',
    });
    expect(productionService.transitionProductionPackage).toHaveBeenCalledWith(
      {
        id: 'admin-id',
        email: 'admin@example.com',
        role: UserRole.Admin,
      },
      'package-id',
      dto,
      {
        ip: '127.0.0.1',
        userAgent: 'jest',
      },
    );
  });
});
