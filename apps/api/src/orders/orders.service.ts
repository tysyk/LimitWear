import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OrderStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { DropsService } from '../drops/drops.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { PublicUser } from '../users/users.service';
import {
  CreateOrderDto,
  validateCreateOrderDto,
  ValidatedCreateOrderInput,
} from './dto/create-order.dto';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly dropsService: DropsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createOrder(user: PublicUser, dto: CreateOrderDto): Promise<OrderDocument> {
    const input = validateCreateOrderDto(dto);
    const drop = await this.dropsService.validatePendingOrderQuantity({
      dropId: input.dropId,
      size: input.size,
      quantity: input.quantity,
    });

    const order = await this.orderModel.create({
      userId: new Types.ObjectId(user.id),
      dropId: new Types.ObjectId(input.dropId),
      designId: drop.designId,
      collectionId: drop.collectionId,
      status: OrderStatus.PendingPayment,
      quantity: input.quantity,
      size: input.size,
      priceAtPurchase: drop.price,
      currency: drop.currency,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      deliveryData: this.toDeliveryData(input),
      canCancel: true,
    });

    await this.notificationsService.safelyCreateServiceNotification({
      userId: order.userId,
      type: 'order.created',
      title: 'Order created',
      message: 'Your LimitWear order was created and is waiting for payment.',
      relatedEntityType: 'order',
      relatedEntityId: order._id,
      metadata: {
        dropId: order.dropId.toHexString(),
        size: order.size,
        quantity: order.quantity,
      },
    });

    return order;
  }

  private toDeliveryData(input: ValidatedCreateOrderInput) {
    return {
      cityRef: input.cityRef,
      cityName: input.cityName,
      warehouseRef: input.warehouseRef,
      warehouseName: input.warehouseName,
      deliveryType: input.deliveryType,
    };
  }
}
