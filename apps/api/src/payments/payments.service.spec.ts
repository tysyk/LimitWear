import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentStatus, UserRole, UserStatus } from '@limitwear/shared';
import { Types } from 'mongoose';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentModel: {
    create: jest.Mock;
    findOne: jest.Mock;
  };
  let orderModel: {
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };
  let monobankService: {
    createHoldInvoice: jest.Mock;
  };
  let dropsService: {
    confirmPaymentHoldQuantity: jest.Mock;
  };
  let auditService: {
    recordWebhookAction: jest.Mock;
  };
  let configService: ConfigService;

  const userId = new Types.ObjectId();
  const orderId = new Types.ObjectId();
  const dropId = new Types.ObjectId();
  const paymentId = new Types.ObjectId();

  const user = {
    id: userId.toHexString(),
    email: 'buyer@limitwear.test',
    role: UserRole.User,
    permissions: [],
    status: UserStatus.Active,
    isEmailVerified: true,
    isPhoneVerified: true,
  };

  beforeEach(() => {
    paymentModel = {
      create: jest.fn(),
      findOne: jest.fn(),
    };
    orderModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    monobankService = {
      createHoldInvoice: jest.fn(),
    };
    dropsService = {
      confirmPaymentHoldQuantity: jest.fn(),
    };
    auditService = {
      recordWebhookAction: jest.fn(),
    };
    configService = new ConfigService();
    service = new PaymentsService(
      paymentModel as never,
      orderModel as never,
      monobankService as never,
      dropsService as never,
      auditService as never,
      configService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a Monobank hold from backend order amount only', async () => {
    const order = createOrderDocument();
    const payment = createPaymentDocument();
    orderModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });
    paymentModel.create.mockResolvedValue(payment);
    monobankService.createHoldInvoice.mockResolvedValue({
      invoiceId: 'invoice-id',
      pageUrl: 'https://pay.mono.test/invoice-id',
    });

    const result = await service.createPaymentHold(user, { orderId: orderId.toHexString() });

    expect(paymentModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        userId,
        dropId,
        amount: 4400,
        currency: 'UAH',
        status: PaymentStatus.Created,
        rawWebhookEvents: [],
      }),
    );
    expect(monobankService.createHoldInvoice).toHaveBeenCalledWith({
      orderId: orderId.toHexString(),
      amount: 4400,
      currency: 'UAH',
    });
    expect(payment.providerInvoiceId).toBe('invoice-id');
    expect(payment.invoiceUrl).toBe('https://pay.mono.test/invoice-id');
    expect(payment.save).toHaveBeenCalled();
    expect(order.paymentId).toBe(paymentId);
    expect(order.save).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        paymentId: paymentId.toHexString(),
        orderId: orderId.toHexString(),
        providerInvoiceId: 'invoice-id',
        paymentUrl: 'https://pay.mono.test/invoice-id',
      }),
    );
  });

  it('rejects hold creation for missing, foreign, non-pending, or already paid orders', async () => {
    orderModel.findById.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
    await expect(
      service.createPaymentHold(user, { orderId: orderId.toHexString() }),
    ).rejects.toThrow(NotFoundException);

    orderModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(createOrderDocument({ userId: new Types.ObjectId() })),
    });
    await expect(
      service.createPaymentHold(user, { orderId: orderId.toHexString() }),
    ).rejects.toThrow(ForbiddenException);

    orderModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(createOrderDocument({ status: OrderStatus.Reserved })),
    });
    await expect(
      service.createPaymentHold(user, { orderId: orderId.toHexString() }),
    ).rejects.toThrow(BadRequestException);

    orderModel.findById.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(createOrderDocument({ paymentId: new Types.ObjectId() })),
    });
    await expect(
      service.createPaymentHold(user, { orderId: orderId.toHexString() }),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks payment failed when Monobank invoice creation fails', async () => {
    const payment = createPaymentDocument();
    orderModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(createOrderDocument()),
    });
    paymentModel.create.mockResolvedValue(payment);
    monobankService.createHoldInvoice.mockRejectedValue(new Error('provider down'));

    await expect(
      service.createPaymentHold(user, { orderId: orderId.toHexString() }),
    ).rejects.toThrow('provider down');

    expect(payment.status).toBe(PaymentStatus.Failed);
    expect(payment.failedAt).toBeInstanceOf(Date);
    expect(payment.failureReason).toBe('Monobank invoice creation failed.');
    expect(payment.save).toHaveBeenCalled();
  });

  it('stores Monobank webhook events and confirms hold quantity once', async () => {
    jest.spyOn(configService, 'get').mockReturnValue('webhook-secret');
    const payment = createPaymentDocument({ providerInvoiceId: 'invoice-id' });
    const order = createOrderDocument();
    paymentModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(payment) });
    orderModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(order) });
    orderModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
    dropsService.confirmPaymentHoldQuantity.mockResolvedValue({});
    auditService.recordWebhookAction.mockResolvedValue({});

    await expect(
      service.handleMonobankWebhook(
        {
          invoiceId: 'invoice-id',
          status: 'hold_created',
          modifiedDate: 1719500000,
        },
        {
          'x-limitwear-webhook-secret': 'webhook-secret',
        },
      ),
    ).resolves.toEqual({
      ok: true,
      duplicate: false,
      paymentId: paymentId.toHexString(),
    });

    expect(payment.rawWebhookEvents).toHaveLength(1);
    expect(dropsService.confirmPaymentHoldQuantity).toHaveBeenCalledWith({
      dropId: dropId.toHexString(),
      size: 'M',
      quantity: 2,
    });
    expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(orderId, {
      status: OrderStatus.Reserved,
    });
    expect(payment.status).toBe(PaymentStatus.HoldCreated);
    expect(payment.save).toHaveBeenCalled();
    expect(auditService.recordWebhookAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment.webhook_received',
      }),
    );
  });

  it('ignores duplicate Monobank webhook events', async () => {
    const payment = createPaymentDocument({
      providerInvoiceId: 'invoice-id',
      rawWebhookEvents: [
        {
          eventId: 'invoice-id:hold_created:1719500000',
          invoiceId: 'invoice-id',
          status: 'hold_created',
          receivedAt: new Date(),
          payload: {},
        },
      ],
    });
    paymentModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(payment) });

    await expect(
      service.handleMonobankWebhook(
        {
          invoiceId: 'invoice-id',
          status: 'hold_created',
          modifiedDate: 1719500000,
        },
        {},
      ),
    ).resolves.toEqual({
      ok: true,
      duplicate: true,
      paymentId: paymentId.toHexString(),
    });

    expect(dropsService.confirmPaymentHoldQuantity).not.toHaveBeenCalled();
    expect(payment.save).not.toHaveBeenCalled();
  });

  it('rejects forged Monobank webhooks when a secret is configured', async () => {
    jest.spyOn(configService, 'get').mockReturnValue('webhook-secret');

    await expect(
      service.handleMonobankWebhook(
        {
          invoiceId: 'invoice-id',
          status: 'hold_created',
        },
        {},
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  function createOrderDocument(overrides: Record<string, unknown> = {}): Record<string, any> {
    return {
      _id: orderId,
      userId,
      dropId,
      status: OrderStatus.PendingPayment,
      quantity: 2,
      size: 'M',
      priceAtPurchase: 2200,
      currency: 'UAH',
      paymentId: undefined,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  function createPaymentDocument(overrides: Record<string, unknown> = {}): Record<string, any> {
    return {
      _id: paymentId,
      orderId,
      userId,
      dropId,
      providerInvoiceId: undefined,
      invoiceUrl: undefined,
      status: PaymentStatus.Created,
      rawWebhookEvents: [],
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }
});
