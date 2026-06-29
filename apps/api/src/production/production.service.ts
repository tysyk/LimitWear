import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DropStatus, OrderStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { AuditRequestContext, AuditService, type ActorUserInput } from '../audit/audit.service';
import { Drop, DropDocument } from '../drops/schemas/drop.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import {
  ProductionPackage,
  ProductionPackageDocument,
  ProductionPackageStatus,
} from './schemas/production-package.schema';
import {
  TransitionProductionPackageDto,
  validateTransitionProductionPackageDto,
} from './dto/transition-production-package.dto';

const PRODUCTION_DROP_STATUSES = [DropStatus.SoldOut, DropStatus.Successful, DropStatus.Completed];
const PRODUCTION_ORDER_STATUSES = [
  OrderStatus.Reserved,
  OrderStatus.Guaranteed,
  OrderStatus.Paid,
  OrderStatus.InProduction,
  OrderStatus.ReadyToShip,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
];

@Injectable()
export class ProductionService {
  constructor(
    @InjectModel(ProductionPackage.name)
    private readonly productionPackageModel: Model<ProductionPackageDocument>,
    @InjectModel(Drop.name) private readonly dropModel: Model<DropDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listProductionPackages(): Promise<ProductionPackage[]> {
    return this.productionPackageModel
      .find()
      .sort({ createdAt: -1 })
      .lean<ProductionPackage[]>()
      .exec();
  }

  async getProductionPackage(id: string): Promise<ProductionPackage> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Production package was not found.');
    }

    const productionPackage = await this.productionPackageModel
      .findById(id)
      .lean<ProductionPackage>()
      .exec();

    if (!productionPackage) {
      throw new NotFoundException('Production package was not found.');
    }

    return productionPackage;
  }

  async ensurePackageForDrop(
    dropId: string,
    admin?: ActorUserInput,
    request?: AuditRequestContext,
  ): Promise<ProductionPackageDocument> {
    if (!Types.ObjectId.isValid(dropId)) {
      throw new NotFoundException('Drop was not found.');
    }

    const drop = await this.dropModel.findById(dropId).exec();
    if (!drop) {
      throw new NotFoundException('Drop was not found.');
    }

    if (!PRODUCTION_DROP_STATUSES.includes(drop.status)) {
      throw new BadRequestException('Production package can be created only for completed drops.');
    }

    const existing = await this.productionPackageModel.findOne({ dropId: drop._id }).exec();
    if (existing) {
      return existing;
    }

    const orders = await this.orderModel
      .find({
        dropId: drop._id,
        status: {
          $in: PRODUCTION_ORDER_STATUSES,
        },
      })
      .exec();
    const sizeBreakdown = this.buildSizeBreakdown(orders);
    const totalQuantity = orders.reduce((total, order) => total + order.quantity, 0);

    const productionPackage = await this.productionPackageModel.create({
      dropId: drop._id,
      designId: drop.designId,
      status: ProductionPackageStatus.ReadyForProduction,
      productType: drop.productType,
      productColor: drop.productColor,
      material: drop.material,
      totalQuantity,
      sizeBreakdown,
      productionFileIds: [],
      mockupIds: [],
      orderIds: orders.map((order) => order._id),
      notes: `Auto-created from drop ${drop.dropNumber}.`,
      createdByAdminId: admin ? new Types.ObjectId(admin.id) : undefined,
    });

    await this.auditService.recordSystemAction({
      action: 'production.package_created',
      entity: {
        type: 'production_package',
        id: productionPackage._id.toHexString(),
      },
      new: {
        dropId: drop._id.toHexString(),
        totalQuantity,
        sizeBreakdown,
      },
      request,
    });

    return productionPackage;
  }

  async transitionProductionPackage(
    admin: ActorUserInput,
    id: string,
    dto: TransitionProductionPackageDto,
    request?: AuditRequestContext,
  ): Promise<ProductionPackageDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Production package was not found.');
    }

    const input = validateTransitionProductionPackageDto(dto);
    const productionPackage = await this.productionPackageModel.findById(id).exec();
    if (!productionPackage) {
      throw new NotFoundException('Production package was not found.');
    }

    const previousStatus = productionPackage.status;
    if (!PRODUCTION_TRANSITIONS[previousStatus]?.includes(input.status)) {
      throw new BadRequestException(
        `Cannot transition production package from ${previousStatus} to ${input.status}.`,
      );
    }

    productionPackage.status = input.status;
    if (input.notes) productionPackage.notes = input.notes;
    if (input.status === ProductionPackageStatus.SentToProducer) {
      productionPackage.sentToProducerAt = new Date();
    }
    if (input.status === ProductionPackageStatus.Completed) {
      productionPackage.completedAt = new Date();
    }
    if (input.status === ProductionPackageStatus.ReadyToShip) {
      productionPackage.readyToShipAt = new Date();
      await this.markOrdersReadyToShip(productionPackage.orderIds);
    }

    const updated = await productionPackage.save();
    await this.auditService.recordAdminAction(admin, {
      action: `production.${input.status}`,
      entity: {
        type: 'production_package',
        id: updated._id.toHexString(),
      },
      old: { status: previousStatus },
      new: {
        status: input.status,
        notes: input.notes,
      },
      request,
    });

    return updated;
  }

  private buildSizeBreakdown(orders: OrderDocument[]): Record<string, number> {
    return orders.reduce<Record<string, number>>((breakdown, order) => {
      breakdown[order.size] = (breakdown[order.size] ?? 0) + order.quantity;
      return breakdown;
    }, {});
  }

  private async markOrdersReadyToShip(orderIds: Types.ObjectId[]): Promise<void> {
    const orders = await this.orderModel
      .find({
        _id: {
          $in: orderIds,
        },
      })
      .exec();

    await this.orderModel
      .updateMany(
        {
          _id: {
            $in: orderIds,
          },
          status: OrderStatus.InProduction,
        },
        {
          $set: {
            status: OrderStatus.ReadyToShip,
            canCancel: false,
            cancelBlockedReason: 'Production package is ready to ship.',
          },
        },
      )
      .exec();

    await Promise.all(
      orders.map((order) =>
        this.notificationsService.safelyCreateServiceNotification({
          userId: order.userId,
          type: 'production.ready_to_ship',
          title: 'Order ready to ship',
          message: 'Your LimitWear order is ready for Nova Poshta delivery.',
          relatedEntityType: 'order',
          relatedEntityId: order._id,
          metadata: {
            productionPackageOrderId: order._id.toHexString(),
          },
        }),
      ),
    );
  }
}

const PRODUCTION_TRANSITIONS: Partial<Record<ProductionPackageStatus, ProductionPackageStatus[]>> =
  {
    [ProductionPackageStatus.Draft]: [
      ProductionPackageStatus.ReadyForProduction,
      ProductionPackageStatus.Cancelled,
    ],
    [ProductionPackageStatus.ReadyForProduction]: [
      ProductionPackageStatus.SentToProducer,
      ProductionPackageStatus.Problem,
      ProductionPackageStatus.Cancelled,
    ],
    [ProductionPackageStatus.SentToProducer]: [
      ProductionPackageStatus.InProduction,
      ProductionPackageStatus.Problem,
      ProductionPackageStatus.Cancelled,
    ],
    [ProductionPackageStatus.InProduction]: [
      ProductionPackageStatus.Completed,
      ProductionPackageStatus.Problem,
      ProductionPackageStatus.Cancelled,
    ],
    [ProductionPackageStatus.Completed]: [
      ProductionPackageStatus.ReadyToShip,
      ProductionPackageStatus.Problem,
    ],
    [ProductionPackageStatus.Problem]: [
      ProductionPackageStatus.ReadyForProduction,
      ProductionPackageStatus.Cancelled,
    ],
  };
