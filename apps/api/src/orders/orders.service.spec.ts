import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus, UserRole, UserStatus } from '@limitwear/shared';
import { Types } from 'mongoose';
import { DeliveryType } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderModel: {
    create: jest.Mock;
    findById: jest.Mock;
  };
  let dropsService: {
    validatePendingOrderQuantity: jest.Mock;
  };
  let notificationsService: jest.Mocked<
    Pick<NotificationsService, 'safelyCreateServiceNotification'>
  >;
  let paymentsService: jest.Mocked<Pick<PaymentsService, 'cancelHoldForOrder'>>;

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
      findById: jest.fn(),
    };
    dropsService = {
      validatePendingOrderQuantity: jest.fn(),
    };
    notificationsService = {
      safelyCreateServiceNotification: jest.fn().mockResolvedValue({}),
    };
    paymentsService = {
      cancelHoldForOrder: jest.fn().mockResolvedValue(undefined),
    };
    service = new OrdersService(
      orderModel as never,
      dropsService as never,
      notificationsService as unknown as NotificationsService,
      paymentsService as unknown as PaymentsService,
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

  it('cancels an owned order before the guaranteed stage and cancels its payment hold', async () => {
    const order = createOrderDocument({
      paymentId: new Types.ObjectId(),
      status: OrderStatus.Reserved,
    });
    orderModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });

    await expect(service.cancelOrder(user, order._id.toHexString())).resolves.toBe(order);

    expect(paymentsService.cancelHoldForOrder).toHaveBeenCalledWith(order);
    expect(order.status).toBe(OrderStatus.Cancelled);
    expect(order.canCancel).toBe(false);
    expect(order.cancelledAt).toBeInstanceOf(Date);
    expect(order.cancelBlockedReason).toBe('Order was cancelled.');
    expect(order.save).toHaveBeenCalled();
    expect(notificationsService.safelyCreateServiceNotification).toHaveBeenCalledWith({
      userId,
      type: 'order.cancelled',
      title: 'Order cancelled',
      message: 'Your LimitWear order was cancelled.',
      relatedEntityType: 'order',
      relatedEntityId: order._id,
      metadata: {
        dropId: dropId.toHexString(),
        size: 'M',
        quantity: 1,
      },
    });
  });

  it('blocks cancellation for guaranteed or locked orders', async () => {
    const order = createOrderDocument({
      status: OrderStatus.Guaranteed,
      cancelBlockedReason: 'Drop is already guaranteed.',
    });
    orderModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });

    await expect(service.cancelOrder(user, order._id.toHexString())).rejects.toThrow(
      BadRequestException,
    );
    expect(paymentsService.cancelHoldForOrder).not.toHaveBeenCalled();
    expect(order.save).not.toHaveBeenCalled();
  });

  it('blocks cancellation of foreign, missing, or invalid orders', async () => {
    await expect(service.cancelOrder(user, 'bad-id')).rejects.toThrow(NotFoundException);

    orderModel.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.cancelOrder(user, new Types.ObjectId().toHexString())).rejects.toThrow(
      NotFoundException,
    );

    orderModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(
        createOrderDocument({
          userId: new Types.ObjectId(),
        }),
      ),
    });
    await expect(service.cancelOrder(user, new Types.ObjectId().toHexString())).rejects.toThrow(
      ForbiddenException,
    );
  });

  function createOrderDocument(overrides: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      userId,
      dropId,
      designId,
      collectionId,
      status: OrderStatus.PendingPayment,
      quantity: 1,
      size: 'M',
      priceAtPurchase: 2200,
      currency: 'UAH',
      canCancel: true,
      cancelledAt: undefined as Date | undefined,
      cancelBlockedReason: undefined as string | undefined,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }
});
