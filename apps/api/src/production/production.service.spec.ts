import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DropStatus, OrderStatus, UserRole } from '@limitwear/shared';
import { Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { ProductType } from '../drops/schemas/drop.schema';
import { ProductionService } from './production.service';
import { ProductionPackageStatus } from './schemas/production-package.schema';

describe('ProductionService', () => {
  let service: ProductionService;
  let productionPackageModel: {
    find: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
  };
  let dropModel: { findById: jest.Mock };
  let orderModel: { find: jest.Mock; updateMany: jest.Mock };
  let auditService: jest.Mocked<Pick<AuditService, 'recordSystemAction' | 'recordAdminAction'>>;

  const packageId = new Types.ObjectId();
  const dropId = new Types.ObjectId();
  const designId = new Types.ObjectId();
  const admin = {
    id: new Types.ObjectId().toHexString(),
    email: 'admin@example.com',
    role: UserRole.Admin,
  };

  beforeEach(() => {
    productionPackageModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    dropModel = { findById: jest.fn() };
    orderModel = { find: jest.fn(), updateMany: jest.fn() };
    auditService = {
      recordSystemAction: jest.fn().mockResolvedValue({}),
      recordAdminAction: jest.fn().mockResolvedValue({}),
    };
    service = new ProductionService(
      productionPackageModel as never,
      dropModel as never,
      orderModel as never,
      auditService as unknown as AuditService,
    );
  });

  it('creates a production package from a successful drop and order list', async () => {
    const firstOrder = createOrder({ size: 'M', quantity: 2 });
    const secondOrder = createOrder({ size: 'L', quantity: 1 });
    const productionPackage = {
      _id: packageId,
    };
    dropModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(createDrop()) });
    productionPackageModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    orderModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([firstOrder, secondOrder]),
    });
    productionPackageModel.create.mockResolvedValue(productionPackage);

    await expect(service.ensurePackageForDrop(dropId.toHexString(), admin)).resolves.toBe(
      productionPackage,
    );

    expect(productionPackageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dropId,
        designId,
        status: ProductionPackageStatus.ReadyForProduction,
        productType: ProductType.Hoodie,
        totalQuantity: 3,
        sizeBreakdown: {
          M: 2,
          L: 1,
        },
        orderIds: [firstOrder._id, secondOrder._id],
      }),
    );
    expect(auditService.recordSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'production.package_created',
      }),
    );
  });

  it('returns an existing production package without creating a duplicate', async () => {
    const existing = { _id: packageId };
    dropModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(createDrop()) });
    productionPackageModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) });

    await expect(service.ensurePackageForDrop(dropId.toHexString(), admin)).resolves.toBe(existing);
    expect(productionPackageModel.create).not.toHaveBeenCalled();
  });

  it('rejects missing and non-completed drops', async () => {
    await expect(service.ensurePackageForDrop('bad-id', admin)).rejects.toThrow(NotFoundException);

    dropModel.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.ensurePackageForDrop(dropId.toHexString(), admin)).rejects.toThrow(
      NotFoundException,
    );

    dropModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(createDrop({ status: DropStatus.ActiveCollecting })),
    });
    await expect(service.ensurePackageForDrop(dropId.toHexString(), admin)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('transitions production packages with audit and marks orders ready to ship', async () => {
    const productionPackage = createProductionPackage({
      status: ProductionPackageStatus.Completed,
      orderIds: [new Types.ObjectId()],
    });
    productionPackageModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(productionPackage),
    });
    orderModel.updateMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });

    await expect(
      service.transitionProductionPackage(admin, packageId.toHexString(), {
        status: ProductionPackageStatus.ReadyToShip,
        notes: 'Ready for Nova Poshta',
      }),
    ).resolves.toBe(productionPackage);

    expect(productionPackage.status).toBe(ProductionPackageStatus.ReadyToShip);
    expect((productionPackage as { readyToShipAt?: Date }).readyToShipAt).toBeInstanceOf(Date);
    expect(orderModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        status: OrderStatus.InProduction,
      }),
      expect.any(Object),
    );
    const [, update] = orderModel.updateMany.mock.calls[0] as [
      unknown,
      { $set: { status: OrderStatus } },
    ];
    expect(update.$set.status).toBe(OrderStatus.ReadyToShip);
    expect(auditService.recordAdminAction).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        action: 'production.ready_to_ship',
      }),
    );
  });

  it('rejects invalid production package transitions', async () => {
    productionPackageModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(
        createProductionPackage({
          status: ProductionPackageStatus.ReadyForProduction,
        }),
      ),
    });

    await expect(
      service.transitionProductionPackage(admin, packageId.toHexString(), {
        status: ProductionPackageStatus.Completed,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  function createDrop(overrides: Record<string, unknown> = {}) {
    return {
      _id: dropId,
      dropNumber: 'LW-100',
      designId,
      status: DropStatus.Successful,
      productType: ProductType.Hoodie,
      productColor: 'Black',
      material: 'Cotton',
      ...overrides,
    };
  }

  function createOrder(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      size: 'M',
      quantity: 1,
      status: OrderStatus.Paid,
      ...overrides,
    };
  }

  function createProductionPackage(overrides: Record<string, unknown> = {}) {
    const productionPackage = {
      _id: packageId,
      status: ProductionPackageStatus.ReadyForProduction,
      orderIds: [],
      ...overrides,
    };
    return Object.assign(productionPackage, {
      save: jest.fn().mockImplementation(() => Promise.resolve(productionPackage)),
    });
  }
});
