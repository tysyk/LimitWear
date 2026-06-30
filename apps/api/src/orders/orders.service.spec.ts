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
    validateOrderSize: jest.Mock;
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
      validateOrderSize: jest.fn(),
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

  it('updates order size before production lock after validating drop size options', async () => {
    const order = createOrderDocument({
      status: OrderStatus.Guaranteed,
    });
    orderModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });
    dropsService.validateOrderSize.mockResolvedValue(undefined);

    await expect(
      service.updateOrderSize(user, order._id.toHexString(), { size: 'L' }),
    ).resolves.toBe(order);

    expect(dropsService.validateOrderSize).toHaveBeenCalledWith(dropId.toHexString(), 'L');
    expect(order.size).toBe('L');
    expect(order.save).toHaveBeenCalled();
    expect(notificationsService.safelyCreateServiceNotification).toHaveBeenCalledWith({
      userId,
      type: 'order.size_updated',
      title: 'Order size updated',
      message: 'Your LimitWear order size was updated.',
      relatedEntityType: 'order',
      relatedEntityId: order._id,
      metadata: {
        dropId: dropId.toHexString(),
        size: 'L',
        quantity: 1,
      },
    });
  });

  it('updates order delivery before production lock', async () => {
    const order = createOrderDocument({
      status: OrderStatus.Reserved,
    });
    orderModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });

    await expect(
      service.updateOrderDelivery(user, order._id.toHexString(), {
        recipientName: 'Updated User',
        recipientPhone: '+380991111111',
        cityRef: 'new-city-ref',
        cityName: 'Kyiv',
        warehouseRef: 'new-warehouse-ref',
        warehouseName: 'Warehouse 7',
        deliveryType: DeliveryType.Postomat,
      }),
    ).resolves.toBe(order);

    expect(order.recipientName).toBe('Updated User');
    expect(order.recipientPhone).toBe('+380991111111');
    expect(order.deliveryData).toEqual({
      cityRef: 'new-city-ref',
      cityName: 'Kyiv',
      warehouseRef: 'new-warehouse-ref',
      warehouseName: 'Warehouse 7',
      deliveryType: DeliveryType.Postomat,
    });
    expect(order.save).toHaveBeenCalled();
    expect(notificationsService.safelyCreateServiceNotification).toHaveBeenCalledWith({
      userId,
      type: 'order.delivery_updated',
      title: 'Order delivery updated',
      message: 'Your LimitWear order delivery details were updated.',
      relatedEntityType: 'order',
      relatedEntityId: order._id,
      metadata: {
        dropId: dropId.toHexString(),
        cityName: 'Kyiv',
        warehouseName: 'Warehouse 7',
      },
    });
  });

  it('blocks size and delivery updates after production lock', async () => {
    const order = createOrderDocument({
      status: OrderStatus.InProduction,
    });
    orderModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });

    await expect(
      service.updateOrderSize(user, order._id.toHexString(), { size: 'L' }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.updateOrderDelivery(user, order._id.toHexString(), dto)).rejects.toThrow(
      BadRequestException,
    );

    expect(dropsService.validateOrderSize).not.toHaveBeenCalled();
    expect(order.save).not.toHaveBeenCalled();
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
      cancelledAt: undefined as Date | undefined,
      cancelBlockedReason: undefined as string | undefined,
      save: jest.fn().mockImplementation(function save(this: unknown) {
        return Promise.resolve(this);
      }),
      ...overrides,
    };
  }
});
