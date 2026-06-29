import { DeliveryStatus } from '@limitwear/shared';
import { DeliveryType } from '../../orders/dto/create-order.dto';
import { Delivery, DeliveryProvider, DeliverySchema } from './delivery.schema';

describe('DeliverySchema', () => {
  it('uses the deliveries collection with timestamps', () => {
    expect(DeliverySchema.get('collection')).toBe('deliveries');
    expect(DeliverySchema.get('timestamps')).toBe(true);
  });

  it('defines baseline delivery fields and defaults', () => {
    expect(DeliverySchema.path('orderId').options.required).toBe(true);
    expect(DeliverySchema.path('userId').options.required).toBe(true);
    expect(DeliverySchema.path('dropId').options.required).toBe(true);
    expect(DeliverySchema.path('provider').options.enum).toEqual(Object.values(DeliveryProvider));
    expect(DeliverySchema.path('provider').options.default).toBe(DeliveryProvider.NovaPoshta);
    expect(DeliverySchema.path('recipientName').options.required).toBe(true);
    expect(DeliverySchema.path('recipientPhone').options.required).toBe(true);
    expect(DeliverySchema.path('cityName').options.required).toBe(true);
    expect(DeliverySchema.path('cityRef').options.required).toBe(true);
    expect(DeliverySchema.path('warehouseName').options.required).toBe(true);
    expect(DeliverySchema.path('warehouseRef').options.required).toBe(true);
    expect(DeliverySchema.path('address')).toBeDefined();
    expect(DeliverySchema.path('deliveryType').options.enum).toEqual(Object.values(DeliveryType));
    expect(DeliverySchema.path('trackingNumber')).toBeDefined();
    expect(DeliverySchema.path('novaPostDocumentRef')).toBeDefined();
    expect(DeliverySchema.path('status').options.enum).toEqual(Object.values(DeliveryStatus));
    expect(DeliverySchema.path('status').options.default).toBe(DeliveryStatus.NotCreated);
    expect(DeliverySchema.path('ttnCreatedAt')).toBeDefined();
    expect(DeliverySchema.path('shippedAt')).toBeDefined();
    expect(DeliverySchema.path('deliveredAt')).toBeDefined();
    expect(DeliverySchema.path('returnedAt')).toBeDefined();
  });

  it('indexes delivery operational lookups', () => {
    expect(DeliverySchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ orderId: 1 }, expect.any(Object)],
        [{ trackingNumber: 1 }, expect.any(Object)],
        [{ status: 1 }, expect.any(Object)],
        [{ cityRef: 1 }, expect.any(Object)],
        [{ warehouseRef: 1 }, expect.any(Object)],
      ]),
    );
  });

  it('exposes the Delivery class for Mongoose registration', () => {
    expect(Delivery.name).toBe('Delivery');
  });
});
