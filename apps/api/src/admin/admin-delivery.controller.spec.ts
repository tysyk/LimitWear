import { DeliveryService } from '../delivery/delivery.service';
import { AdminDeliveryController } from './admin-delivery.controller';

describe('AdminDeliveryController', () => {
  let controller: AdminDeliveryController;
  let deliveryService: jest.Mocked<Pick<DeliveryService, 'createTtnForOrder'>>;

  beforeEach(() => {
    deliveryService = {
      createTtnForOrder: jest.fn(),
    };
    controller = new AdminDeliveryController(deliveryService as unknown as DeliveryService);
  });

  it('delegates TTN creation to delivery service', async () => {
    const dto = {
      weight: 1,
      seatsAmount: 1,
      description: 'LimitWear order',
      cost: 2200,
    };
    deliveryService.createTtnForOrder.mockResolvedValue({ id: 'delivery-id' } as never);

    await expect(controller.createTtn('order-id', dto)).resolves.toEqual({ id: 'delivery-id' });
    expect(deliveryService.createTtnForOrder).toHaveBeenCalledWith('order-id', dto);
  });
});
