import { DropStatus, UserRole, UserStatus } from '@limitwear/shared';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { DropsService } from '../drops/drops.service';
import { ProductType } from '../drops/schemas/drop.schema';
import { PaymentsService } from '../payments/payments.service';
import { ProductionService } from '../production/production.service';
import { AdminDropsController } from './admin-drops.controller';

describe('AdminDropsController', () => {
  let controller: AdminDropsController;
  let dropsService: jest.Mocked<
    Pick<DropsService, 'createAdminDrop' | 'updateAdminDrop' | 'launchDrop' | 'transitionDrop'>
  >;
  let paymentsService: jest.Mocked<
    Pick<PaymentsService, 'finalizeActiveHoldsForDrop' | 'cancelActiveHoldsForDrop'>
  >;
  let productionService: jest.Mocked<Pick<ProductionService, 'ensurePackageForDrop'>>;

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

  const createDto = {
    designId: 'design-id',
    dropNumber: 'LW-100',
    title: 'Angel Skull Hoodie',
    slug: 'angel-skull-hoodie',
    productType: ProductType.Hoodie,
    price: 2200,
    designerRevenuePercent: 15,
    minQuantity: 20,
    maxQuantity: 100,
    sizeOptions: ['S', 'M', 'L'],
    startsAt: '2026-07-01T10:00:00.000Z',
    endsAt: '2026-07-08T10:00:00.000Z',
  };

  beforeEach(() => {
    dropsService = {
      createAdminDrop: jest.fn(),
      updateAdminDrop: jest.fn(),
      launchDrop: jest.fn(),
      transitionDrop: jest.fn(),
    };
    paymentsService = {
      finalizeActiveHoldsForDrop: jest.fn(),
      cancelActiveHoldsForDrop: jest.fn(),
    };
    productionService = {
      ensurePackageForDrop: jest.fn(),
    };
    controller = new AdminDropsController(
      dropsService as unknown as DropsService,
      paymentsService as unknown as PaymentsService,
      productionService as unknown as ProductionService,
    );
  });

  it('delegates drop creation to the drops service', async () => {
    dropsService.createAdminDrop.mockResolvedValue({ id: 'drop-id' } as never);

    await expect(controller.create(createDto, request)).resolves.toEqual({ id: 'drop-id' });
    expect(dropsService.createAdminDrop).toHaveBeenCalledWith(request.user, createDto);
  });

  it('delegates drop update to the drops service', async () => {
    dropsService.updateAdminDrop.mockResolvedValue({ id: 'drop-id' } as never);

    await expect(controller.update('drop-id', { title: 'Updated Drop' }, request)).resolves.toEqual(
      {
        id: 'drop-id',
      },
    );
    expect(dropsService.updateAdminDrop).toHaveBeenCalledWith(request.user, 'drop-id', {
      title: 'Updated Drop',
    });
  });

  it('delegates drop launch to the drops service with request context', async () => {
    dropsService.launchDrop.mockResolvedValue({ id: 'drop-id' } as never);

    await expect(controller.launch('drop-id', request)).resolves.toEqual({ id: 'drop-id' });
    expect(dropsService.launchDrop).toHaveBeenCalledWith(request.user, 'drop-id', {
      ip: '127.0.0.1',
      userAgent: 'jest',
    });
  });

  it('delegates lifecycle transitions to the drops service with request context', async () => {
    dropsService.transitionDrop.mockResolvedValue({ id: 'drop-id' } as never);

    await expect(
      controller.transition('drop-id', { status: DropStatus.ReadyForLaunch }, request),
    ).resolves.toEqual({ id: 'drop-id' });
    expect(dropsService.transitionDrop).toHaveBeenCalledWith(
      request.user,
      'drop-id',
      DropStatus.ReadyForLaunch,
      {
        ip: '127.0.0.1',
        userAgent: 'jest',
      },
    );
    expect(paymentsService.finalizeActiveHoldsForDrop).not.toHaveBeenCalled();
    expect(paymentsService.cancelActiveHoldsForDrop).not.toHaveBeenCalled();
    expect(productionService.ensurePackageForDrop).not.toHaveBeenCalled();
  });

  it('finalizes active holds and creates a production package for successful drops', async () => {
    dropsService.transitionDrop.mockResolvedValue({ id: 'drop-id' } as never);
    paymentsService.finalizeActiveHoldsForDrop.mockResolvedValue({} as never);
    productionService.ensurePackageForDrop.mockResolvedValue({} as never);

    await expect(
      controller.transition('drop-id', { status: DropStatus.Successful }, request),
    ).resolves.toEqual({ id: 'drop-id' });

    expect(paymentsService.finalizeActiveHoldsForDrop).toHaveBeenCalledWith('drop-id');
    expect(paymentsService.cancelActiveHoldsForDrop).not.toHaveBeenCalled();
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

  it('cancels active holds when a drop fails', async () => {
    dropsService.transitionDrop.mockResolvedValue({ id: 'drop-id' } as never);
    paymentsService.cancelActiveHoldsForDrop.mockResolvedValue({} as never);

    await expect(
      controller.transition('drop-id', { status: DropStatus.Failed }, request),
    ).resolves.toEqual({ id: 'drop-id' });

    expect(paymentsService.cancelActiveHoldsForDrop).toHaveBeenCalledWith('drop-id');
    expect(paymentsService.finalizeActiveHoldsForDrop).not.toHaveBeenCalled();
    expect(productionService.ensurePackageForDrop).not.toHaveBeenCalled();
  });
});
