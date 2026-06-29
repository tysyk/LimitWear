import { BadRequestException } from '@nestjs/common';
import { OrderStatus, UserRole, UserStatus } from '@limitwear/shared';
import { Types } from 'mongoose';
import { DeliveryType } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderModel: {
    create: jest.Mock;
  };
  let dropsService: {
    validatePendingOrderQuantity: jest.Mock;
  };
  let notificationsService: jest.Mocked<
    Pick<NotificationsService, 'safelyCreateServiceNotification'>
  >;

  const userId = new Types.ObjectId();
  const dropId = new Types.ObjectId();
  const designId = new Types.ObjectId();
  const collectionId = new Types.ObjectId();

  const user = {
    id: userId.toHexString(),
    email: 'buyer@limitwear.test',
    role: UserRole.User,
    permissions: [],
    status: UserStatus.Active,
    isEmailVerified: true,
    isPhoneVerified: true,
  };

  const dto = {
    dropId: dropId.toHexString(),
    size: 'M',
    quantity: 1,
    recipientName: 'Олег Тисик',
    recipientPhone: '+380991234567',
    cityRef: 'city-ref',
    cityName: 'Львів',
    warehouseRef: 'warehouse-ref',
    warehouseName: 'Відділення №1',
    deliveryType: DeliveryType.Warehouse,
  };

  beforeEach(() => {
    orderModel = {
      create: jest.fn(),
    };
    dropsService = {
      validatePendingOrderQuantity: jest.fn(),
    };
    notificationsService = {
      safelyCreateServiceNotification: jest.fn().mockResolvedValue({}),
    };
    service = new OrdersService(
      orderModel as never,
      dropsService as never,
      notificationsService as unknown as NotificationsService,
    );
  });

  it('creates a pending payment order without incrementing drop quantity', async () => {
    const createdOrder = {
      _id: new Types.ObjectId(),
      userId,
      dropId,
      size: 'M',
      quantity: 1,
      status: OrderStatus.PendingPayment,
    };
    dropsService.validatePendingOrderQuantity.mockResolvedValue({
      _id: dropId,
      designId,
      collectionId,
      price: 2200,
      currency: 'UAH',
    });
    orderModel.create.mockResolvedValue(createdOrder);

    await expect(service.createOrder(user, dto)).resolves.toBe(createdOrder);

    expect(dropsService.validatePendingOrderQuantity).toHaveBeenCalledWith({
      dropId: dropId.toHexString(),
      size: 'M',
      quantity: 1,
    });
    expect(orderModel.create).toHaveBeenCalledWith({
      userId,
      dropId,
      designId,
      collectionId,
      status: OrderStatus.PendingPayment,
      quantity: 1,
      size: 'M',
      priceAtPurchase: 2200,
      currency: 'UAH',
      recipientName: 'Олег Тисик',
      recipientPhone: '+380991234567',
      deliveryData: {
        cityRef: 'city-ref',
        cityName: 'Львів',
        warehouseRef: 'warehouse-ref',
        warehouseName: 'Відділення №1',
        deliveryType: DeliveryType.Warehouse,
      },
      canCancel: true,
    });
    expect(notificationsService.safelyCreateServiceNotification).toHaveBeenCalledWith({
      userId,
      type: 'order.created',
      title: 'Order created',
      message: 'Your LimitWear order was created and is waiting for payment.',
      relatedEntityType: 'order',
      relatedEntityId: createdOrder._id,
      metadata: {
        dropId: dropId.toHexString(),
        size: 'M',
        quantity: 1,
      },
    });
  });

  it('does not create an order when dto validation fails', async () => {
    await expect(
      service.createOrder(user, {
        ...dto,
        quantity: 0,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(dropsService.validatePendingOrderQuantity).not.toHaveBeenCalled();
    expect(orderModel.create).not.toHaveBeenCalled();
  });

  it('does not create an order when the drop cannot reserve the requested quantity', async () => {
    dropsService.validatePendingOrderQuantity.mockRejectedValue(
      new BadRequestException('Drop is not accepting orders.'),
    );

    await expect(service.createOrder(user, dto)).rejects.toThrow(BadRequestException);
    expect(orderModel.create).not.toHaveBeenCalled();
  });
});
