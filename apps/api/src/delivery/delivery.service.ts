import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DeliveryStatus, OrderStatus } from '@limitwear/shared';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { CreateTtnDto, validateCreateTtnDto } from './dto/create-ttn.dto';
import { NovaPoshtaService } from './nova-poshta.service';
import { Delivery, DeliveryDocument, DeliveryProvider } from './schemas/delivery.schema';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectModel(Delivery.name) private readonly deliveryModel: Model<DeliveryDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly novaPoshtaService: NovaPoshtaService,
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

    const ttn = await this.novaPoshtaService.createTtn({
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
}
