import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DropStatus, OrderStatus, UserRole, UserStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import {
  DesignerProfile,
  DesignerProfileDocument,
  DesignerProfileStatus,
} from '../designer-profiles/schemas/designer-profile.schema';
import { Design, DesignDocument, DesignStatus } from '../designs/schemas/design.schema';
import { Drop, DropDocument } from '../drops/schemas/drop.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { Payout, PayoutDocument, PayoutStatus } from '../payouts/schemas/payout.schema';
import {
  SecondChanceListing,
  SecondChanceListingDocument,
  SecondChanceListingStatus,
} from '../second-chance/schemas/second-chance-listing.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

export interface AdminAnalytics {
  users: {
    total: number;
    designers: number;
    active: number;
    blocked: number;
  };
  drops: {
    total: number;
    active: number;
    successful: number;
    failed: number;
  };
  orders: {
    total: number;
    paid: number;
    returned: number;
    soldUnits: number;
  };
  revenue: {
    gross: number;
    returns: number;
    net: number;
    currency: string;
  };
  secondChance: {
    soldListings: number;
    revenue: number;
    soldUnits: number;
  };
  payouts: {
    pendingAmount: number;
    paidAmount: number;
    readyToPayAmount: number;
  };
}

export interface DesignerAnalytics {
  designerProfileId?: string;
  designs: {
    total: number;
    approved: number;
  };
  drops: {
    total: number;
    successful: number;
  };
  orders: {
    soldUnits: number;
  };
  revenue: {
    gross: number;
    currency: string;
  };
  payouts: {
    pendingAmount: number;
    paidAmount: number;
    readyToPayAmount: number;
  };
}

const REVENUE_ORDER_STATUSES = [
  OrderStatus.Paid,
  OrderStatus.InProduction,
  OrderStatus.ReadyToShip,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
];

const RETURN_ORDER_STATUSES = [OrderStatus.Returned, OrderStatus.Refunded];

const SUCCESSFUL_DROP_STATUSES = [
  DropStatus.SoldOut,
  DropStatus.Successful,
  DropStatus.Completed,
  DropStatus.Delivered,
  DropStatus.ForeverClosed,
];

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(DesignerProfile.name)
    private readonly designerProfileModel: Model<DesignerProfileDocument>,
    @InjectModel(Design.name) private readonly designModel: Model<DesignDocument>,
    @InjectModel(Drop.name) private readonly dropModel: Model<DropDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Payout.name) private readonly payoutModel: Model<PayoutDocument>,
    @InjectModel(SecondChanceListing.name)
    private readonly secondChanceModel: Model<SecondChanceListingDocument>,
  ) {}

  async getAdminAnalytics(): Promise<AdminAnalytics> {
    const [
      totalUsers,
      designers,
      activeUsers,
      blockedUsers,
      totalDrops,
      activeDrops,
      successfulDrops,
      failedDrops,
      totalOrders,
      paidOrders,
      returnedOrders,
      orderRevenue,
      returnRevenue,
      secondChanceRevenue,
      payoutTotals,
    ] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ role: UserRole.Designer }).exec(),
      this.userModel.countDocuments({ status: UserStatus.Active }).exec(),
      this.userModel.countDocuments({ status: UserStatus.Blocked }).exec(),
      this.dropModel.countDocuments().exec(),
      this.dropModel
        .countDocuments({ status: { $in: [DropStatus.Active, DropStatus.ActiveCollecting] } })
        .exec(),
      this.dropModel.countDocuments({ status: { $in: SUCCESSFUL_DROP_STATUSES } }).exec(),
      this.dropModel.countDocuments({ status: DropStatus.Failed }).exec(),
      this.orderModel.countDocuments().exec(),
      this.orderModel.countDocuments({ status: { $in: REVENUE_ORDER_STATUSES } }).exec(),
      this.orderModel.countDocuments({ status: { $in: RETURN_ORDER_STATUSES } }).exec(),
      this.sumOrderRevenue({ status: { $in: REVENUE_ORDER_STATUSES } }),
      this.sumOrderRevenue({ status: { $in: RETURN_ORDER_STATUSES } }),
      this.sumSecondChanceRevenue({ status: SecondChanceListingStatus.Sold }),
      this.sumPayouts(),
    ]);

    return {
      users: {
        total: totalUsers,
        designers,
        active: activeUsers,
        blocked: blockedUsers,
      },
      drops: {
        total: totalDrops,
        active: activeDrops,
        successful: successfulDrops,
        failed: failedDrops,
      },
      orders: {
        total: totalOrders,
        paid: paidOrders,
        returned: returnedOrders,
        soldUnits: orderRevenue.units,
      },
      revenue: {
        gross: orderRevenue.amount,
        returns: returnRevenue.amount,
        net: Math.max(0, orderRevenue.amount - returnRevenue.amount + secondChanceRevenue.amount),
        currency: 'UAH',
      },
      secondChance: {
        soldListings: secondChanceRevenue.count,
        revenue: secondChanceRevenue.amount,
        soldUnits: secondChanceRevenue.units,
      },
      payouts: payoutTotals,
    };
  }

  async getDesignerAnalytics(userId: string): Promise<DesignerAnalytics> {
    const userObjectId = this.toObjectId(userId);
    const profile = await this.designerProfileModel
      .findOne({
        userId: userObjectId,
        status: DesignerProfileStatus.Active,
      })
      .lean<DesignerProfile & { _id: Types.ObjectId }>()
      .exec();

    const designerId = profile?._id;
    const [totalDesigns, approvedDesigns] = await Promise.all([
      this.designModel.countDocuments({ createdByUserId: userObjectId }).exec(),
      this.designModel
        .countDocuments({ createdByUserId: userObjectId, status: DesignStatus.Approved })
        .exec(),
    ]);

    if (!designerId) {
      return {
        designs: {
          total: totalDesigns,
          approved: approvedDesigns,
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
      };
    }

    const designerDrops = await this.dropModel
      .find({ designerId }, { _id: 1, status: 1 })
      .lean<Array<{ _id: Types.ObjectId; status: DropStatus }>>()
      .exec();
    const dropIds = designerDrops.map((drop) => drop._id);
    const [orderRevenue, payoutTotals] = await Promise.all([
      this.sumOrderRevenue({
        dropId: { $in: dropIds },
        status: { $in: REVENUE_ORDER_STATUSES },
      }),
      this.sumPayouts({ designerId }),
    ]);

    return {
      designerProfileId: designerId.toHexString(),
      designs: {
        total: totalDesigns,
        approved: approvedDesigns,
      },
      drops: {
        total: designerDrops.length,
        successful: designerDrops.filter((drop) => SUCCESSFUL_DROP_STATUSES.includes(drop.status))
          .length,
      },
      orders: {
        soldUnits: orderRevenue.units,
      },
      revenue: {
        gross: orderRevenue.amount,
        currency: 'UAH',
      },
      payouts: payoutTotals,
    };
  }

  private async sumOrderRevenue(match: Record<string, unknown>): Promise<{
    amount: number;
    units: number;
  }> {
    const [result] = await this.orderModel
      .aggregate<{ amount: number; units: number }>([
        { $match: match },
        {
          $group: {
            _id: null,
            amount: { $sum: { $multiply: ['$priceAtPurchase', '$quantity'] } },
            units: { $sum: '$quantity' },
          },
        },
      ])
      .exec();

    return {
      amount: result?.amount ?? 0,
      units: result?.units ?? 0,
    };
  }

  private async sumSecondChanceRevenue(match: Record<string, unknown>): Promise<{
    amount: number;
    count: number;
    units: number;
  }> {
    const [result] = await this.secondChanceModel
      .aggregate<{ amount: number; count: number; units: number }>([
        { $match: match },
        {
          $group: {
            _id: null,
            amount: { $sum: { $multiply: ['$price', '$quantity'] } },
            count: { $sum: 1 },
            units: { $sum: '$quantity' },
          },
        },
      ])
      .exec();

    return {
      amount: result?.amount ?? 0,
      count: result?.count ?? 0,
      units: result?.units ?? 0,
    };
  }

  private async sumPayouts(
    match: Record<string, unknown> = {},
  ): Promise<AdminAnalytics['payouts']> {
    const [result] = await this.payoutModel
      .aggregate<AdminAnalytics['payouts']>([
        { $match: match },
        {
          $group: {
            _id: null,
            pendingAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', PayoutStatus.Pending] }, '$amount', 0],
              },
            },
            readyToPayAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', PayoutStatus.ReadyToPay] }, '$amount', 0],
              },
            },
            paidAmount: { $sum: '$paidAmount' },
          },
        },
      ])
      .exec();

    return {
      pendingAmount: result?.pendingAmount ?? 0,
      paidAmount: result?.paidAmount ?? 0,
      readyToPayAmount: result?.readyToPayAmount ?? 0,
    };
  }

  private toObjectId(value: string): Types.ObjectId {
    return new Types.ObjectId(value);
  }
}
