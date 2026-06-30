import { UserRole, UserStatus } from '@limitwear/shared';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { DeliveryType } from './dto/create-order.dto';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<
    Pick<OrdersService, 'createOrder' | 'cancelOrder' | 'updateOrderSize' | 'updateOrderDelivery'>
  >;

  const request = {
    user: {
      id: 'user-id',
      email: 'buyer@limitwear.test',
      role: UserRole.User,
      permissions: [],
      status: UserStatus.Active,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  } as unknown as AuthenticatedRequest;

  const dto = {
    dropId: '6674b275c08ff9a9c9a4b001',
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
    ordersService = {
      createOrder: jest.fn(),
      cancelOrder: jest.fn(),
      updateOrderSize: jest.fn(),
      updateOrderDelivery: jest.fn(),
    };
    controller = new OrdersController(ordersService as unknown as OrdersService);
  });

  it('delegates order creation to the orders service for the authenticated user', async () => {
    ordersService.createOrder.mockResolvedValue({ id: 'order-id' } as never);

    await expect(controller.createOrder(dto, request)).resolves.toEqual({ id: 'order-id' });
    expect(ordersService.createOrder).toHaveBeenCalledWith(request.user, dto);
  });

  it('delegates order cancellation to the orders service for the authenticated user', async () => {
    ordersService.cancelOrder.mockResolvedValue({ id: 'order-id', status: 'cancelled' } as never);

    await expect(controller.cancelOrder('order-id', request)).resolves.toEqual({
      id: 'order-id',
      status: 'cancelled',
    });
    expect(ordersService.cancelOrder).toHaveBeenCalledWith(request.user, 'order-id');
  });

  it('delegates order size updates to the orders service', async () => {
    ordersService.updateOrderSize.mockResolvedValue({ id: 'order-id', size: 'L' } as never);

    await expect(controller.updateOrderSize('order-id', { size: 'L' }, request)).resolves.toEqual({
      id: 'order-id',
      size: 'L',
    });
    expect(ordersService.updateOrderSize).toHaveBeenCalledWith(request.user, 'order-id', {
      size: 'L',
    });
  });

  it('delegates order delivery updates to the orders service', async () => {
    ordersService.updateOrderDelivery.mockResolvedValue({
      id: 'order-id',
      recipientName: 'Updated User',
    } as never);

    await expect(controller.updateOrderDelivery('order-id', dto, request)).resolves.toEqual({
      id: 'order-id',
      recipientName: 'Updated User',
    });
    expect(ordersService.updateOrderDelivery).toHaveBeenCalledWith(request.user, 'order-id', dto);
  });
});
