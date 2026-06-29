import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DeliveryStatus, OrderStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { AuditService } from '../audit/audit.service';
import { CreateTtnDto, validateCreateTtnDto } from './dto/create-ttn.dto';
import { NovaPoshtaService } from './nova-poshta.service';
import { Delivery, DeliveryDocument, DeliveryProvider } from './schemas/delivery.schema';

export interface BulkCreateTtnResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    orderId: string;
    deliveryId: string;
    trackingNumber?: string;
  }>;
  errors: Array<{
    orderId: string;
    message: string;
  }>;
}

@Injectable()
export class DeliveryService {
  constructor(
    @InjectModel(Delivery.name) private readonly deliveryModel: Model<DeliveryDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly novaPoshtaService: NovaPoshtaService,
    private readonly auditService: AuditService,
  ) {}

  async createTtnForOrder(orderId: string, dto: CreateTtnDto): Promise<DeliveryDocument> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException('Order was not found.');
    }
    const input = validateCreateTtnDto(dto);
    const order = await this.orderModel.findById(orderId).exec();

    if (!order) {
      throw new NotFoundException('Order was not found.');
    }
    if (order.status !== OrderStatus.ReadyToShip) {
      throw new BadRequestException('TTN can be created only for ready to ship orders.');
    }
    if (order.deliveryId) {
      throw new BadRequestException('Order already has a delivery.');
    }

    const ttn = await this.createNovaPoshtaTtnOrMarkProblem(order, input);

    const delivery = await this.deliveryModel.create({
      orderId: order._id,
      userId: order.userId,
      dropId: order.dropId,
      provider: DeliveryProvider.NovaPoshta,
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      cityName: order.deliveryData.cityName,
      cityRef: order.deliveryData.cityRef,
      warehouseName: order.deliveryData.warehouseName,
      warehouseRef: order.deliveryData.warehouseRef,
      deliveryType: order.deliveryData.deliveryType,
      trackingNumber: ttn.trackingNumber,
      novaPostDocumentRef: ttn.documentRef,
      status: DeliveryStatus.TtnCreated,
      ttnCreatedAt: new Date(),
    });

    order.deliveryId = delivery._id;
    await order.save();
    return delivery;
  }

  private async createNovaPoshtaTtnOrMarkProblem(
    order: OrderDocument,
    input: ReturnType<typeof validateCreateTtnDto>,
  ) {
    try {
      return await this.novaPoshtaService.createTtn({
        orderId: order._id.toHexString(),
        recipientName: order.recipientName,
        recipientPhone: order.recipientPhone,
        cityRef: order.deliveryData.cityRef,
        warehouseRef: order.deliveryData.warehouseRef,
        weight: input.weight,
        seatsAmount: input.seatsAmount,
        description: input.description,
        cost: input.cost,
      });
    } catch (error) {
      order.status = OrderStatus.DeliveryProblem;
      await order.save();
      await this.auditService.recordSystemAction({
        action: 'delivery.ttn_failed',
        entity: {
          type: 'order',
          id: order._id.toHexString(),
        },
        new: {
          status: OrderStatus.DeliveryProblem,
          reason: error instanceof Error ? error.message : 'Unknown TTN creation error.',
        },
        reason: 'Nova Poshta TTN creation failed; admin follow-up required.',
      });
      throw error;
    }
  }

  async createTtnForOrders(orderIds: string[], dto: CreateTtnDto): Promise<BulkCreateTtnResult> {
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new BadRequestException('At least one orderId is required.');
    }

    const results: BulkCreateTtnResult['results'] = [];
    const errors: BulkCreateTtnResult['errors'] = [];

    for (const orderId of orderIds) {
      try {
        const delivery = await this.createTtnForOrder(orderId, dto);
        results.push({
          orderId,
          deliveryId: delivery._id.toHexString(),
          trackingNumber: delivery.trackingNumber,
        });
      } catch (error) {
        errors.push({
          orderId,
          message: error instanceof Error ? error.message : 'Unknown TTN creation error.',
        });
      }
    }

    return {
      total: orderIds.length,
      succeeded: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}
