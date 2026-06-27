import { UserRole, UserStatus } from '@limitwear/shared';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { DeliveryType } from './dto/create-order.dto';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<Pick<OrdersService, 'createOrder'>>;

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
    };
    controller = new OrdersController(ordersService as unknown as OrdersService);
  });

  it('delegates order creation to the orders service for the authenticated user', async () => {
    ordersService.createOrder.mockResolvedValue({ id: 'order-id' } as never);

    await expect(controller.createOrder(dto, request)).resolves.toEqual({ id: 'order-id' });
    expect(ordersService.createOrder).toHaveBeenCalledWith(request.user, dto);
  });
});
