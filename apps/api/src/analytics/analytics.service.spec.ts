import { DropStatus, OrderStatus, UserRole, UserStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { DesignerProfileStatus } from '../designer-profiles/schemas/designer-profile.schema';
import { DesignStatus } from '../designs/schemas/design.schema';
import { SecondChanceListingStatus } from '../second-chance/schemas/second-chance-listing.schema';
import { AnalyticsService } from './analytics.service';

const createExecQuery = <T>(result: T) => ({
  exec: jest.fn().mockResolvedValue(result),
});

const createLeanQuery = <T>(result: T) => ({
  lean: jest.fn().mockReturnValue(createExecQuery(result)),
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let userModel: {
    countDocuments: jest.Mock;
  };
  let designerProfileModel: {
    findOne: jest.Mock;
  };
  let designModel: {
    countDocuments: jest.Mock;
  };
  let dropModel: {
    countDocuments: jest.Mock;
    find: jest.Mock;
  };
  let orderModel: {
    countDocuments: jest.Mock;
    aggregate: jest.Mock;
  };
  let payoutModel: {
    aggregate: jest.Mock;
  };
  let secondChanceModel: {
    aggregate: jest.Mock;
  };

  beforeEach(() => {
    userModel = {
      countDocuments: jest.fn(),
    };
    designerProfileModel = {
      findOne: jest.fn(),
    };
    designModel = {
      countDocuments: jest.fn(),
    };
    dropModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
    };
    orderModel = {
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
    };
    payoutModel = {
      aggregate: jest.fn(),
    };
    secondChanceModel = {
      aggregate: jest.fn(),
    };
    service = new AnalyticsService(
      userModel as unknown as Model<never>,
      designerProfileModel as never,
      designModel as never,
      dropModel as never,
      orderModel as never,
      payoutModel as never,
      secondChanceModel as never,
    );
  });

  it('builds admin analytics from platform counters and revenue aggregates', async () => {
    mockCountSequence(userModel.countDocuments, [10, 2, 9, 1]);
    mockCountSequence(dropModel.countDocuments, [5, 1, 3, 1]);
    mockCountSequence(orderModel.countDocuments, [12, 8, 2]);
    orderModel.aggregate
      .mockReturnValueOnce(createExecQuery([{ amount: 12000, units: 10 }]))
      .mockReturnValueOnce(createExecQuery([{ amount: 1000, units: 1 }]));
    secondChanceModel.aggregate.mockReturnValue(
      createExecQuery([{ amount: 500, count: 1, units: 1 }]),
    );
    payoutModel.aggregate.mockReturnValue(
      createExecQuery([{ pendingAmount: 300, paidAmount: 700, readyToPayAmount: 500 }]),
    );

    await expect(service.getAdminAnalytics()).resolves.toEqual({
      users: {
        total: 10,
        designers: 2,
        active: 9,
        blocked: 1,
      },
      drops: {
        total: 5,
        active: 1,
        successful: 3,
        failed: 1,
      },
      orders: {
        total: 12,
        paid: 8,
        returned: 2,
        soldUnits: 10,
      },
      revenue: {
        gross: 12000,
        returns: 1000,
        net: 11500,
        currency: 'UAH',
      },
      secondChance: {
        soldListings: 1,
        revenue: 500,
        soldUnits: 1,
      },
      payouts: {
        pendingAmount: 300,
        paidAmount: 700,
        readyToPayAmount: 500,
      },
    });

    expect(userModel.countDocuments).toHaveBeenCalledWith({ role: UserRole.Designer });
    expect(userModel.countDocuments).toHaveBeenCalledWith({ status: UserStatus.Active });
    expect(userModel.countDocuments).toHaveBeenCalledWith({ status: UserStatus.Blocked });
    expect(secondChanceModel.aggregate).toHaveBeenCalledWith([
      { $match: { status: SecondChanceListingStatus.Sold } },
      expect.any(Object),
    ]);
  });

  it('builds designer analytics from own designs, drops, orders, and payouts', async () => {
    const userId = new Types.ObjectId();
    const designerId = new Types.ObjectId();
    const firstDropId = new Types.ObjectId();
    const secondDropId = new Types.ObjectId();
    designerProfileModel.findOne.mockReturnValue(
      createLeanQuery({
        _id: designerId,
        userId,
        status: DesignerProfileStatus.Active,
      }),
    );
    mockCountSequence(designModel.countDocuments, [4, 2]);
    dropModel.find.mockReturnValue(
      createLeanQuery([
        { _id: firstDropId, status: DropStatus.Completed },
        { _id: secondDropId, status: DropStatus.Failed },
      ]),
    );
    orderModel.aggregate.mockReturnValue(createExecQuery([{ amount: 4200, units: 3 }]));
    payoutModel.aggregate.mockReturnValue(
      createExecQuery([{ pendingAmount: 100, paidAmount: 200, readyToPayAmount: 300 }]),
    );

    await expect(service.getDesignerAnalytics(userId.toHexString())).resolves.toEqual({
      designerProfileId: designerId.toHexString(),
      designs: {
        total: 4,
        approved: 2,
      },
      drops: {
        total: 2,
        successful: 1,
      },
      orders: {
        soldUnits: 3,
      },
      revenue: {
        gross: 4200,
        currency: 'UAH',
      },
      payouts: {
        pendingAmount: 100,
        paidAmount: 200,
        readyToPayAmount: 300,
      },
    });

    expect(designerProfileModel.findOne).toHaveBeenCalledWith({
      userId,
      status: DesignerProfileStatus.Active,
    });
    expect(designModel.countDocuments).toHaveBeenCalledWith({ createdByUserId: userId });
    expect(designModel.countDocuments).toHaveBeenCalledWith({
      createdByUserId: userId,
      status: DesignStatus.Approved,
    });
    expect(orderModel.aggregate).toHaveBeenCalledWith([
      {
        $match: {
          dropId: { $in: [firstDropId, secondDropId] },
          status: {
            $in: [
              OrderStatus.Paid,
              OrderStatus.InProduction,
              OrderStatus.ReadyToShip,
              OrderStatus.Shipped,
              OrderStatus.Delivered,
            ],
          },
        },
      },
      expect.any(Object),
    ]);
    expect(payoutModel.aggregate).toHaveBeenCalledWith([
      { $match: { designerId } },
      expect.any(Object),
    ]);
  });

  it('returns empty drop and payout metrics when a designer profile is missing', async () => {
    const userId = new Types.ObjectId();
    designerProfileModel.findOne.mockReturnValue(createLeanQuery(null));
    mockCountSequence(designModel.countDocuments, [1, 0]);

    await expect(service.getDesignerAnalytics(userId.toHexString())).resolves.toEqual({
      designs: {
        total: 1,
        approved: 0,
      },
      drops: {
        total: 0,
        successful: 0,
      },
      orders: {
        soldUnits: 0,
      },
      revenue: {
        gross: 0,
        currency: 'UAH',
      },
      payouts: {
        pendingAmount: 0,
        paidAmount: 0,
        readyToPayAmount: 0,
      },
    });

    expect(dropModel.find).not.toHaveBeenCalled();
    expect(orderModel.aggregate).not.toHaveBeenCalled();
    expect(payoutModel.aggregate).not.toHaveBeenCalled();
  });
});

function mockCountSequence(mock: jest.Mock, results: number[]) {
  for (const result of results) {
    mock.mockReturnValueOnce(createExecQuery(result));
  }
}
