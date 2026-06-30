import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DropStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { AuditRequestContext, AuditService, type ActorUserInput } from '../audit/audit.service';
import {
  DesignerProfile,
  DesignerProfileDocument,
} from '../designer-profiles/schemas/designer-profile.schema';
import { Drop, DropDocument } from '../drops/schemas/drop.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { MarkPayoutPaidDto, validateMarkPayoutPaidDto } from './dto/mark-payout-paid.dto';
import { calculatePayout } from './payout-calculation';
import { Payout, PayoutDocument, PayoutStatus } from './schemas/payout.schema';

const PAYOUT_DROP_STATUSES = new Set<DropStatus>([
  DropStatus.Completed,
  DropStatus.Delivered,
  DropStatus.ForeverClosed,
]);

@Injectable()
export class PayoutsService {
  constructor(
    @InjectModel(Payout.name)
    private readonly payoutModel: Model<PayoutDocument>,
    @InjectModel(Drop.name)
    private readonly dropModel: Model<DropDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(DesignerProfile.name)
    private readonly designerProfileModel: Model<DesignerProfileDocument>,
    private readonly auditService: AuditService,
  ) {}

  async listAdminPayouts(): Promise<Payout[]> {
    return this.payoutModel.find().sort({ createdAt: -1 }).lean<Payout[]>().exec();
  }

  async listDesignerPayouts(userId: string): Promise<Payout[]> {
    const designerProfile = await this.designerProfileModel
      .findOne({ userId: this.toObjectId(userId) })
      .lean<DesignerProfile & { _id: Types.ObjectId }>()
      .exec();

    if (!designerProfile) {
      return [];
    }

    return this.payoutModel
      .find({ designerId: designerProfile._id })
      .sort({ createdAt: -1 })
      .lean<Payout[]>()
      .exec();
  }

  async ensurePayoutForDrop(dropId: string): Promise<PayoutDocument> {
    const drop = await this.findPayoutDrop(dropId);
    const existing = await this.payoutModel.findOne({ dropId: drop._id }).exec();
    const calculated = await this.calculateForDrop(drop);

    if (existing) {
      if (existing.status === PayoutStatus.Paid || existing.status === PayoutStatus.PartiallyPaid) {
        return existing;
      }

      existing.amount = calculated.amount;
      existing.currency = calculated.currency;
      existing.designerRevenuePercent = drop.designerRevenuePercent;
      existing.calculationBase = calculated.calculationBase;
      existing.status = calculated.status;
      existing.scheduledAt =
        calculated.status === PayoutStatus.ReadyToPay ? new Date() : existing.scheduledAt;

      return existing.save();
    }

    return this.payoutModel.create({
      designerId: drop.designerId,
      dropId: drop._id,
      amount: calculated.amount,
      paidAmount: 0,
      currency: calculated.currency,
      designerRevenuePercent: drop.designerRevenuePercent,
      calculationBase: calculated.calculationBase,
      status: calculated.status,
      scheduledAt: calculated.status === PayoutStatus.ReadyToPay ? new Date() : undefined,
      notes: `Auto-calculated from drop ${drop.dropNumber}.`,
    });
  }

  async markPaid(
    admin: ActorUserInput,
    id: string,
    dto: MarkPayoutPaidDto,
    request?: AuditRequestContext,
  ): Promise<PayoutDocument> {
    const input = validateMarkPayoutPaidDto(dto);
    const payout = await this.payoutModel.findById(this.toObjectId(id)).exec();

    if (!payout) {
      throw new NotFoundException('Payout was not found.');
    }

    if (payout.status === PayoutStatus.Paid || payout.status === PayoutStatus.Cancelled) {
      throw new BadRequestException(`Cannot mark ${payout.status} payout as paid.`);
    }

    const previous = {
      status: payout.status,
      paidAmount: payout.paidAmount,
    };
    const amountToApply = input.amount ?? Math.max(0, payout.amount - payout.paidAmount);
    const nextPaidAmount = Math.min(payout.amount, payout.paidAmount + amountToApply);

    payout.paidAmount = nextPaidAmount;
    payout.status =
      nextPaidAmount >= payout.amount ? PayoutStatus.Paid : PayoutStatus.PartiallyPaid;
    payout.paidByAdminId = this.toObjectId(admin.id);
    payout.paidAt = payout.status === PayoutStatus.Paid ? new Date() : payout.paidAt;
    payout.notes = input.notes ?? payout.notes;

    const updated = await payout.save();
    await this.auditService.recordAdminAction(admin, {
      action: 'payout.mark_paid',
      entity: {
        type: 'payout',
        id: updated._id.toHexString(),
      },
      old: previous,
      new: {
        status: updated.status,
        paidAmount: updated.paidAmount,
        notes: input.notes,
      },
      reason: input.notes,
      request,
    });

    return updated;
  }

  private async findPayoutDrop(dropId: string): Promise<DropDocument> {
    const drop = await this.dropModel.findById(this.toObjectId(dropId)).exec();

    if (!drop) {
      throw new NotFoundException('Drop was not found.');
    }

    if (!drop.designerId) {
      throw new BadRequestException('Drop does not have a designer assigned.');
    }

    if (!PAYOUT_DROP_STATUSES.has(drop.status)) {
      throw new BadRequestException('Payout can be calculated only after drop completion.');
    }

    return drop;
  }

  private async calculateForDrop(drop: DropDocument) {
    const orders = await this.orderModel.find({ dropId: drop._id }).lean<Order[]>().exec();

    return calculatePayout({
      orders,
      currency: drop.currency,
      designerRevenuePercent: drop.designerRevenuePercent,
      returnWindowEndsAt: this.getReturnWindowEndsAt(drop),
    });
  }

  private getReturnWindowEndsAt(drop: DropDocument): Date | undefined {
    const date = drop.completedAt ?? drop.endsAt;

    if (!date) {
      return undefined;
    }

    return new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  private toObjectId(value: string | Types.ObjectId): Types.ObjectId {
    if (value instanceof Types.ObjectId) {
      return value;
    }

    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('ObjectId is invalid.');
    }

    return new Types.ObjectId(value);
  }
}
