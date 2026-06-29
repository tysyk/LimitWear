import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeliveryStatus, OrderStatus } from '@limitwear/shared';
import { Types } from 'mongoose';
import { DeliveryService } from './delivery.service';
import { DeliveryType } from '../orders/dto/create-order.dto';
import { AuditService } from '../audit/audit.service';

describe('DeliveryService', () => {
  let service: DeliveryService;
  let deliveryModel: { create: jest.Mock };
  let orderModel: { findById: jest.Mock };
  let novaPoshtaService: { createTtn: jest.Mock };
  let auditService: jest.Mocked<Pick<AuditService, 'recordSystemAction'>>;

  const orderId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const dropId = new Types.ObjectId();
  const deliveryId = new Types.ObjectId();

  beforeEach(() => {
    deliveryModel = { create: jest.fn() };
    orderModel = { findById: jest.fn() };
    novaPoshtaService = { createTtn: jest.fn() };
    auditService = { recordSystemAction: jest.fn().mockResolvedValue({}) };
    service = new DeliveryService(
      deliveryModel as never,
      orderModel as never,
      novaPoshtaService as never,
      auditService as unknown as AuditService,
    );
  });

  it('creates a TTN delivery for a ready-to-ship order', async () => {
    const order = createOrder();
    const delivery = { _id: deliveryId };
    orderModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });
    novaPoshtaService.createTtn.mockResolvedValue({
      trackingNumber: '20450000000000',
      documentRef: 'document-ref',
    });
    deliveryModel.create.mockResolvedValue(delivery);

    await expect(
      service.createTtnForOrder(orderId.toHexString(), {
        weight: 1,
        seatsAmount: 1,
        description: 'LimitWear order',
        cost: 2200,
      }),
    ).resolves.toBe(delivery);

    expect(novaPoshtaService.createTtn).toHaveBeenCalledWith({
      orderId: orderId.toHexString(),
      recipientName: 'Buyer',
      recipientPhone: '+380991234567',
      cityRef: 'city-ref',
      warehouseRef: 'warehouse-ref',
      weight: 1,
      seatsAmount: 1,
      description: 'LimitWear order',
      cost: 2200,
    });
    expect(deliveryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        userId,
        dropId,
        trackingNumber: '20450000000000',
        novaPostDocumentRef: 'document-ref',
        status: DeliveryStatus.TtnCreated,
      }),
    );
    expect(order.deliveryId).toBe(deliveryId);
    expect(order.save).toHaveBeenCalled();
  });

  it('marks the order as a delivery problem and creates an admin follow-up source when TTN fails', async () => {
    const order = createOrder();
    const providerError = new Error('Nova Poshta returned an error.');
    orderModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });
    novaPoshtaService.createTtn.mockRejectedValue(providerError);

    await expect(service.createTtnForOrder(orderId.toHexString(), validDto())).rejects.toThrow(
      providerError,
    );

    expect(order.status).toBe(OrderStatus.DeliveryProblem);
    expect(order.save).toHaveBeenCalled();
    expect(deliveryModel.create).not.toHaveBeenCalled();
    expect(auditService.recordSystemAction).toHaveBeenCalledWith({
      action: 'delivery.ttn_failed',
      entity: {
        type: 'order',
        id: orderId.toHexString(),
      },
      new: {
        status: OrderStatus.DeliveryProblem,
        reason: 'Nova Poshta returned an error.',
      },
      reason: 'Nova Poshta TTN creation failed; admin follow-up required.',
    });
  });

  it('rejects missing, non-ready, and already delivered orders', async () => {
    await expect(service.createTtnForOrder('invalid', validDto())).rejects.toThrow(
      NotFoundException,
    );

    orderModel.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.createTtnForOrder(orderId.toHexString(), validDto())).rejects.toThrow(
      NotFoundException,
    );

    orderModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(createOrder({ status: OrderStatus.Paid })),
    });
    await expect(service.createTtnForOrder(orderId.toHexString(), validDto())).rejects.toThrow(
      BadRequestException,
    );

    orderModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(createOrder({ deliveryId: new Types.ObjectId() })),
    });
    await expect(service.createTtnForOrder(orderId.toHexString(), validDto())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates TTNs in bulk and keeps partial failures isolated', async () => {
    const secondOrderId = new Types.ObjectId();
    const notReadyOrderId = new Types.ObjectId();
    const firstOrder = createOrder();
    const secondOrder = createOrder({ _id: secondOrderId });
    const firstDelivery = {
      _id: deliveryId,
      trackingNumber: '20450000000000',
    };
    const secondDelivery = {
      _id: new Types.ObjectId(),
      trackingNumber: '20450000000001',
    };
    orderModel.findById
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(firstOrder) })
      .mockReturnValueOnce({
        exec: jest
          .fn()
          .mockResolvedValue(createOrder({ _id: notReadyOrderId, status: OrderStatus.Paid })),
      })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(secondOrder) });
    novaPoshtaService.createTtn
      .mockResolvedValueOnce({
        trackingNumber: '20450000000000',
        documentRef: 'document-ref',
      })
      .mockResolvedValueOnce({
        trackingNumber: '20450000000001',
        documentRef: 'document-ref-2',
      });
    deliveryModel.create.mockResolvedValueOnce(firstDelivery).mockResolvedValueOnce(secondDelivery);

    await expect(
      service.createTtnForOrders(
        [orderId.toHexString(), notReadyOrderId.toHexString(), secondOrderId.toHexString()],
        validDto(),
      ),
    ).resolves.toEqual({
      total: 3,
      succeeded: 2,
      failed: 1,
      results: [
        {
          orderId: orderId.toHexString(),
          deliveryId: deliveryId.toHexString(),
          trackingNumber: '20450000000000',
        },
        {
          orderId: secondOrderId.toHexString(),
          deliveryId: secondDelivery._id.toHexString(),
          trackingNumber: '20450000000001',
        },
      ],
      errors: [
        {
          orderId: notReadyOrderId.toHexString(),
          message: 'TTN can be created only for ready to ship orders.',
        },
      ],
    });
  });

  it('rejects empty bulk TTN requests', async () => {
    await expect(service.createTtnForOrders([], validDto())).rejects.toThrow(BadRequestException);
  });

  function validDto() {
    return { weight: 1, seatsAmount: 1, description: 'LimitWear order', cost: 2200 };
  }

  function createOrder(overrides: Record<string, unknown> = {}) {
    return {
      _id: orderId,
      userId,
      dropId,
      status: OrderStatus.ReadyToShip,
      recipientName: 'Buyer',
      recipientPhone: '+380991234567',
      deliveryData: {
        cityRef: 'city-ref',
        cityName: 'Kyiv',
        warehouseRef: 'warehouse-ref',
        warehouseName: 'Warehouse #1',
        deliveryType: DeliveryType.Warehouse,
      },
      deliveryId: undefined,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }
});
