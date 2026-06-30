import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DropStatus, UserRole, UserStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { DropsService, PUBLIC_DROP_STATUSES } from './drops.service';
import { ProductType, DropDocument } from './schemas/drop.schema';

type QueryMock = {
  sort: jest.Mock;
  limit: jest.Mock;
  lean: jest.Mock;
  exec: jest.Mock;
};

const createQueryMock = <T>(result: T): QueryMock => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(result),
});

describe('DropsService', () => {
  let service: DropsService;
  let designId: Types.ObjectId;
  let designerId: Types.ObjectId;
  let adminId: Types.ObjectId;
  let dropModel: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOne: jest.Mock;
  };
  let designModel: {
    findById: jest.Mock;
  };
  let auditService: {
    recordAdminAction: jest.Mock;
    recordSystemAction: jest.Mock;
  };
  let wishlistService: {
    notifyLowStockForDrop: jest.Mock;
  };

  const admin = () => ({
    id: adminId.toHexString(),
    email: 'admin@limitwear.test',
    role: UserRole.Admin,
    permissions: [],
    status: UserStatus.Active,
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  const validCreateDropDto = () => ({
    designId: designId.toHexString(),
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
  });

  const createDropDocument = (overrides: Partial<DropDocument> = {}) =>
    ({
      _id: new Types.ObjectId(),
      ...validCreateDropDto(),
      designId,
      designerId,
      currentQuantity: 0,
      sizeBreakdown: {},
      status: DropStatus.Draft,
      startsAt: new Date('2026-07-01T10:00:00.000Z'),
      endsAt: new Date('2026-07-08T10:00:00.000Z'),
      save: jest.fn().mockImplementation(function save(this: DropDocument) {
        return Promise.resolve(this);
      }),
      ...overrides,
    }) as DropDocument;

  beforeEach(() => {
    designId = new Types.ObjectId();
    designerId = new Types.ObjectId();
    adminId = new Types.ObjectId();
    dropModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOne: jest.fn(),
    };
    designModel = {
      findById: jest.fn(),
    };
    auditService = {
      recordAdminAction: jest.fn().mockResolvedValue({}),
      recordSystemAction: jest.fn().mockResolvedValue({}),
    };
    wishlistService = {
      notifyLowStockForDrop: jest.fn().mockResolvedValue({ notifiedCount: 0 }),
    };
    service = new DropsService(
      dropModel as unknown as Model<DropDocument>,
      designModel as never,
      auditService as never,
      wishlistService as never,
    );
  });

  it('lists only public drops sorted for storefront display', async () => {
    const query = createQueryMock([{ slug: 'angel-skull' }]);
    dropModel.find.mockReturnValue(query);

    await expect(service.findPublicDrops()).resolves.toEqual([{ slug: 'angel-skull' }]);

    expect(dropModel.find).toHaveBeenCalledWith({
      status: {
        $in: PUBLIC_DROP_STATUSES,
      },
    });
    expect(query.sort).toHaveBeenCalledWith({
      startsAt: -1,
      createdAt: -1,
    });
  });

  it('returns a public drop by normalized slug', async () => {
    const query = createQueryMock({ slug: 'angel-skull', status: DropStatus.ActiveCollecting });
    dropModel.findOne.mockReturnValue(query);

    await expect(service.findPublicDropBySlug(' Angel-Skull ')).resolves.toEqual({
      slug: 'angel-skull',
      status: DropStatus.ActiveCollecting,
    });

    expect(dropModel.findOne).toHaveBeenCalledWith({
      slug: 'angel-skull',
      status: {
        $in: PUBLIC_DROP_STATUSES,
      },
    });
  });

  it('throws when a drop is not public or does not exist', async () => {
    const query = createQueryMock(null);
    dropModel.findOne.mockReturnValue(query);

    await expect(service.findPublicDropBySlug('draft-drop')).rejects.toThrow(NotFoundException);
  });

  it('lists related drops by collection or designer and excludes the current drop', async () => {
    const currentDropQuery = createQueryMock({
      _id: 'drop-id',
      slug: 'angel-skull',
      collectionId: 'collection-id',
      designerId: 'designer-id',
    });
    const relatedDropsQuery = createQueryMock([{ slug: 'related-drop' }]);
    dropModel.findOne.mockReturnValue(currentDropQuery);
    dropModel.find.mockReturnValue(relatedDropsQuery);

    await expect(service.findRelatedPublicDrops('angel-skull')).resolves.toEqual([
      { slug: 'related-drop' },
    ]);

    expect(dropModel.find).toHaveBeenCalledWith({
      _id: {
        $ne: 'drop-id',
      },
      status: {
        $in: PUBLIC_DROP_STATUSES,
      },
      $or: [
        {
          collectionId: 'collection-id',
        },
        {
          designerId: 'designer-id',
        },
      ],
    });
    expect(relatedDropsQuery.limit).toHaveBeenCalledWith(8);
  });

  it('returns an empty related list when a drop has no relation anchors', async () => {
    const currentDropQuery = createQueryMock({
      _id: 'drop-id',
      slug: 'standalone',
    });
    dropModel.findOne.mockReturnValue(currentDropQuery);

    await expect(service.findRelatedPublicDrops('standalone')).resolves.toEqual([]);
    expect(dropModel.find).not.toHaveBeenCalled();
  });

  it('creates a draft admin drop from an existing design without accepting current quantity', async () => {
    const dto = validCreateDropDto();
    const createdDrop = createDropDocument();
    designModel.findById.mockReturnValue(createQueryMock({ _id: designId, designerId }));
    dropModel.create.mockResolvedValue(createdDrop);

    await expect(service.createAdminDrop(admin(), dto)).resolves.toBe(createdDrop);

    expect(dropModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        designId,
        designerId,
        currentQuantity: 0,
        sizeBreakdown: {},
        status: DropStatus.Draft,
        createdByAdminId: adminId,
      }),
    );
  });

  it('rejects invalid admin drop commercial terms', async () => {
    const dto = {
      ...validCreateDropDto(),
      price: 0,
    };

    await expect(service.createAdminDrop(admin(), dto)).rejects.toThrow(BadRequestException);
    expect(designModel.findById).not.toHaveBeenCalled();
  });

  it('locks commercial fields after launch', async () => {
    const saveMock = jest.fn();
    const launchedDrop = createDropDocument({
      status: DropStatus.ActiveCollecting,
      save: saveMock as never,
    });
    dropModel.findById.mockReturnValue(createQueryMock(launchedDrop));

    await expect(
      service.updateAdminDrop(admin(), launchedDrop._id.toHexString(), {
        designerRevenuePercent: 20,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('updates editable drop fields and audits the change', async () => {
    const saveMock = jest.fn().mockImplementation(function save(this: DropDocument) {
      return Promise.resolve(this);
    });
    const draftDrop = createDropDocument({
      save: saveMock as never,
    });
    dropModel.findById.mockReturnValue(createQueryMock(draftDrop));

    await expect(
      service.updateAdminDrop(admin(), draftDrop._id.toHexString(), {
        title: 'Updated Angel Skull Hoodie',
      }),
    ).resolves.toBe(draftDrop);

    expect(draftDrop.title).toBe('Updated Angel Skull Hoodie');
    expect(saveMock).toHaveBeenCalled();
    expect(auditService.recordAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: adminId.toHexString() }),
      expect.objectContaining({
        action: 'drop.updated',
        entity: { type: 'drop', id: draftDrop._id.toHexString() },
      }),
    );
  });

  it('launches only a ready drop and writes an audit log', async () => {
    const readyDrop = createDropDocument({
      status: DropStatus.ReadyForLaunch,
    });
    dropModel.findById.mockReturnValue(createQueryMock(readyDrop));

    await expect(service.launchDrop(admin(), readyDrop._id.toHexString())).resolves.toBe(readyDrop);

    expect(readyDrop.status).toBe(DropStatus.ActiveCollecting);
    expect(auditService.recordAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: adminId.toHexString() }),
      expect.objectContaining({
        action: `drop.${DropStatus.ActiveCollecting}`,
        old: { status: DropStatus.ReadyForLaunch },
        new: { status: DropStatus.ActiveCollecting },
      }),
    );
  });

  it('rejects launch when a drop is not ready for launch', async () => {
    const draftDrop = createDropDocument();
    dropModel.findById.mockReturnValue(createQueryMock(draftDrop));

    await expect(service.launchDrop(admin(), draftDrop._id.toHexString())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects invalid lifecycle transitions', async () => {
    const draftDrop = createDropDocument();
    dropModel.findById.mockReturnValue(createQueryMock(draftDrop));

    await expect(
      service.transitionDrop(admin(), draftDrop._id.toHexString(), DropStatus.Completed),
    ).rejects.toThrow(BadRequestException);
  });

  it('allows valid lifecycle transitions and stamps terminal dates', async () => {
    const deliveredDrop = createDropDocument({
      status: DropStatus.Delivered,
    });
    dropModel.findById.mockReturnValue(createQueryMock(deliveredDrop));

    await expect(
      service.transitionDrop(admin(), deliveredDrop._id.toHexString(), DropStatus.Completed),
    ).resolves.toBe(deliveredDrop);

    expect(deliveredDrop.status).toBe(DropStatus.Completed);
    expect(deliveredDrop.completedAt).toBeInstanceOf(Date);
    expect(auditService.recordAdminAction).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        action: `drop.${DropStatus.Completed}`,
      }),
    );
  });

  it('validates pending order quantity without incrementing current quantity', async () => {
    const activeDrop = createDropDocument({
      status: DropStatus.ActiveCollecting,
      currentQuantity: 9,
      minQuantity: 10,
      maxQuantity: 20,
    });
    dropModel.findById.mockReturnValue(createQueryMock(activeDrop));

    await expect(
      service.validatePendingOrderQuantity({
        dropId: activeDrop._id.toHexString(),
        size: 'M',
        quantity: 1,
      }),
    ).resolves.toBe(activeDrop);

    expect(activeDrop.currentQuantity).toBe(9);
    expect(dropModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects pending order quantity that would overbook a drop', async () => {
    const nearlySoldOutDrop = createDropDocument({
      status: DropStatus.ActiveCollecting,
      currentQuantity: 19,
      maxQuantity: 20,
    });
    dropModel.findById.mockReturnValue(createQueryMock(nearlySoldOutDrop));

    await expect(
      service.validatePendingOrderQuantity({
        dropId: nearlySoldOutDrop._id.toHexString(),
        size: 'M',
        quantity: 2,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unavailable or unsafe size values', async () => {
    const activeDrop = createDropDocument({
      status: DropStatus.ActiveCollecting,
    });
    dropModel.findById.mockReturnValue(createQueryMock(activeDrop));

    await expect(
      service.validatePendingOrderQuantity({
        dropId: activeDrop._id.toHexString(),
        size: 'XL',
        quantity: 1,
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.validatePendingOrderQuantity({
        dropId: activeDrop._id.toHexString(),
        size: 'M.$inc',
        quantity: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('confirms payment hold with an atomic quantity increment', async () => {
    const activeDrop = createDropDocument({
      status: DropStatus.ActiveCollecting,
      currentQuantity: 8,
      minQuantity: 10,
      maxQuantity: 20,
    });
    const updatedDrop = createDropDocument({
      _id: activeDrop._id,
      status: DropStatus.ActiveCollecting,
      currentQuantity: 9,
      minQuantity: 10,
      maxQuantity: 20,
    });
    dropModel.findById.mockReturnValue(createQueryMock(activeDrop));
    dropModel.findOneAndUpdate.mockReturnValue(createQueryMock(updatedDrop));

    await expect(
      service.confirmPaymentHoldQuantity({
        dropId: activeDrop._id.toHexString(),
        size: 'M',
        quantity: 1,
      }),
    ).resolves.toBe(updatedDrop);

    expect(dropModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: activeDrop._id,
        sizeOptions: 'M',
        currentQuantity: {
          $lte: 19,
        },
      }),
      {
        $inc: {
          currentQuantity: 1,
          'sizeBreakdown.M': 1,
        },
      },
      {
        new: true,
      },
    );
    expect(wishlistService.notifyLowStockForDrop).toHaveBeenCalledWith({
      dropId: updatedDrop._id,
      title: updatedDrop.title,
      currentQuantity: updatedDrop.currentQuantity,
      maxQuantity: updatedDrop.maxQuantity,
    });
  });

  it('moves a drop to guaranteed when confirmed quantity reaches the minimum', async () => {
    const saveMock = jest.fn().mockImplementation(function save(this: DropDocument) {
      return Promise.resolve(this);
    });
    const activeDrop = createDropDocument({
      status: DropStatus.ActiveCollecting,
      currentQuantity: 9,
      minQuantity: 10,
      maxQuantity: 20,
    });
    const updatedDrop = createDropDocument({
      _id: activeDrop._id,
      status: DropStatus.ActiveCollecting,
      currentQuantity: 10,
      minQuantity: 10,
      maxQuantity: 20,
      save: saveMock as never,
    });
    dropModel.findById.mockReturnValue(createQueryMock(activeDrop));
    dropModel.findOneAndUpdate.mockReturnValue(createQueryMock(updatedDrop));

    await service.confirmPaymentHoldQuantity({
      dropId: activeDrop._id.toHexString(),
      size: 'M',
      quantity: 1,
    });

    expect(updatedDrop.status).toBe(DropStatus.Guaranteed);
    expect(saveMock).toHaveBeenCalled();
    expect(auditService.recordSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: `drop.${DropStatus.Guaranteed}`,
        old: { status: DropStatus.ActiveCollecting },
        new: {
          status: DropStatus.Guaranteed,
          currentQuantity: 10,
        },
      }),
    );
  });

  it('moves a drop to sold out when confirmed quantity reaches the maximum', async () => {
    const saveMock = jest.fn().mockImplementation(function save(this: DropDocument) {
      return Promise.resolve(this);
    });
    const guaranteedDrop = createDropDocument({
      status: DropStatus.Guaranteed,
      currentQuantity: 19,
      minQuantity: 10,
      maxQuantity: 20,
    });
    const updatedDrop = createDropDocument({
      _id: guaranteedDrop._id,
      status: DropStatus.Guaranteed,
      currentQuantity: 20,
      minQuantity: 10,
      maxQuantity: 20,
      save: saveMock as never,
    });
    dropModel.findById.mockReturnValue(createQueryMock(guaranteedDrop));
    dropModel.findOneAndUpdate.mockReturnValue(createQueryMock(updatedDrop));

    await service.confirmPaymentHoldQuantity({
      dropId: guaranteedDrop._id.toHexString(),
      size: 'M',
      quantity: 1,
    });

    expect(updatedDrop.status).toBe(DropStatus.SoldOut);
    expect(saveMock).toHaveBeenCalled();
    expect(auditService.recordSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: `drop.${DropStatus.SoldOut}`,
        old: { status: DropStatus.Guaranteed },
        new: {
          status: DropStatus.SoldOut,
          currentQuantity: 20,
        },
      }),
    );
  });

  it('rejects stale confirmed holds when the atomic update cannot reserve quantity', async () => {
    const activeDrop = createDropDocument({
      status: DropStatus.ActiveCollecting,
      currentQuantity: 19,
      maxQuantity: 20,
    });
    dropModel.findById.mockReturnValue(createQueryMock(activeDrop));
    dropModel.findOneAndUpdate.mockReturnValue(createQueryMock(null));

    await expect(
      service.confirmPaymentHoldQuantity({
        dropId: activeDrop._id.toHexString(),
        size: 'M',
        quantity: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
