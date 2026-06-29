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
    find: jest.Mock;
  };
  let orderModel: {
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };
  let monobankService: {
    createHoldInvoice: jest.Mock;
    finalizeHold: jest.Mock;
    cancelHold: jest.Mock;
  };
  let dropsService: {
    confirmPaymentHoldQuantity: jest.Mock;
  };
  let auditService: {
    recordWebhookAction: jest.Mock;
    recordSystemAction: jest.Mock;
  };
  let configService: ConfigService;
  let notificationsService: {
    safelyCreateServiceNotification: jest.Mock;
  };

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

  interface TestOrderDocument {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    dropId: Types.ObjectId;
    status: OrderStatus;
    quantity: number;
    size: string;
    priceAtPurchase: number;
    currency: string;
    paymentId?: Types.ObjectId;
    save: jest.Mock;
  }

  interface TestPaymentDocument {
    _id: Types.ObjectId;
    orderId: Types.ObjectId;
    userId: Types.ObjectId;
    dropId: Types.ObjectId;
    providerInvoiceId?: string;
    invoiceUrl?: string;
    status: PaymentStatus;
    rawWebhookEvents: Array<{
      eventId: string;
      invoiceId: string;
      status?: string;
      receivedAt: Date;
      payload: Record<string, unknown>;
    }>;
    finalizedAt?: Date;
    cancelledAt?: Date;
    failedAt?: Date;
    failureReason?: string;
    save: jest.Mock;
  }

  beforeEach(() => {
    paymentModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    orderModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    monobankService = {
      createHoldInvoice: jest.fn(),
      finalizeHold: jest.fn(),
      cancelHold: jest.fn(),
    };
    dropsService = {
      confirmPaymentHoldQuantity: jest.fn(),
    };
    auditService = {
      recordWebhookAction: jest.fn(),
      recordSystemAction: jest.fn(),
    };
    configService = new ConfigService();
    notificationsService = {
      safelyCreateServiceNotification: jest.fn(),
    };
    service = new PaymentsService(
      paymentModel as never,
      orderModel as never,
      monobankService as never,
      dropsService as never,
      auditService as never,
      configService,
      notificationsService as never,
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
    expect(notificationsService.safelyCreateServiceNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        type: 'payment.hold_created',
        relatedEntityType: 'order',
        relatedEntityId: orderId,
      }),
    );
  });

  it('marks payment and order failed without reserving quantity on failed webhook', async () => {
    const payment = createPaymentDocument({ providerInvoiceId: 'invoice-id' });
    paymentModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(payment) });
    orderModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
    auditService.recordWebhookAction.mockResolvedValue({});

    await expect(
      service.handleMonobankWebhook(
        {
          invoiceId: 'invoice-id',
          status: 'failed',
          modifiedDate: 1719500001,
        },
        {},
      ),
    ).resolves.toEqual({
      ok: true,
      duplicate: false,
      paymentId: paymentId.toHexString(),
    });

    expect(payment.status).toBe(PaymentStatus.Failed);
    expect(payment.failedAt).toBeInstanceOf(Date);
    expect(payment.failureReason).toBe('failed');
    expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(orderId, {
      status: OrderStatus.PaymentFailed,
    });
    expect(dropsService.confirmPaymentHoldQuantity).not.toHaveBeenCalled();
    expect(notificationsService.safelyCreateServiceNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        type: 'payment.failed',
        relatedEntityType: 'payment',
        relatedEntityId: paymentId,
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

  it('finalizes active holds for a successful drop', async () => {
    const payment = createPaymentDocument({
      providerInvoiceId: 'invoice-id',
      status: PaymentStatus.HoldCreated,
    });
    paymentModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([payment]) });
    orderModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
    monobankService.finalizeHold.mockResolvedValue(undefined);

    await expect(service.finalizeActiveHoldsForDrop(dropId.toHexString())).resolves.toEqual({
      dropId: dropId.toHexString(),
      total: 1,
      succeeded: 1,
      failed: 0,
      paymentIds: [paymentId.toHexString()],
    });

    expect(paymentModel.find).toHaveBeenCalledWith({
      dropId,
      status: {
        $in: [PaymentStatus.HoldCreated, PaymentStatus.Authorized],
      },
    });
    expect(monobankService.finalizeHold).toHaveBeenCalledWith('invoice-id');
    expect(payment.status).toBe(PaymentStatus.Finalized);
    expect(payment.finalizedAt).toBeInstanceOf(Date);
    expect(payment.save).toHaveBeenCalled();
    expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(orderId, {
      status: OrderStatus.Paid,
      paidAt: payment.finalizedAt,
      canCancel: false,
      cancelBlockedReason: 'Payment was finalized.',
    });
    expect(notificationsService.safelyCreateServiceNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        type: 'payment.finalized',
        relatedEntityType: 'payment',
        relatedEntityId: paymentId,
      }),
    );
  });

  it('cancels active holds for a failed drop', async () => {
    const payment = createPaymentDocument({
      providerInvoiceId: 'invoice-id',
      status: PaymentStatus.HoldCreated,
    });
    paymentModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([payment]) });
    orderModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
    monobankService.cancelHold.mockResolvedValue(undefined);

    await expect(service.cancelActiveHoldsForDrop(dropId.toHexString())).resolves.toEqual({
      dropId: dropId.toHexString(),
      total: 1,
      succeeded: 1,
      failed: 0,
      paymentIds: [paymentId.toHexString()],
    });

    expect(monobankService.cancelHold).toHaveBeenCalledWith('invoice-id');
    expect(payment.status).toBe(PaymentStatus.Cancelled);
    expect(payment.cancelledAt).toBeInstanceOf(Date);
    expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(orderId, {
      status: OrderStatus.Cancelled,
      cancelledAt: payment.cancelledAt,
      canCancel: false,
      cancelBlockedReason: 'Drop did not happen.',
    });
    expect(notificationsService.safelyCreateServiceNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        type: 'payment.cancelled',
      }),
    );
  });

  it('records lifecycle failures and continues processing remaining holds', async () => {
    const failedPayment = createPaymentDocument({
      _id: new Types.ObjectId(),
      providerInvoiceId: 'failed-invoice',
      status: PaymentStatus.HoldCreated,
    });
    const succeededPayment = createPaymentDocument({
      providerInvoiceId: 'invoice-id',
      status: PaymentStatus.HoldCreated,
    });
    paymentModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([failedPayment, succeededPayment]),
    });
    orderModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });
    monobankService.finalizeHold
      .mockRejectedValueOnce(new Error('provider timeout'))
      .mockResolvedValueOnce(undefined);
    auditService.recordSystemAction.mockResolvedValue({});

    await expect(service.finalizeActiveHoldsForDrop(dropId.toHexString())).resolves.toEqual({
      dropId: dropId.toHexString(),
      total: 2,
      succeeded: 1,
      failed: 1,
      paymentIds: [failedPayment._id.toHexString(), paymentId.toHexString()],
    });

    expect(auditService.recordSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'payment.finalize_failed',
        entity: { type: 'payment', id: failedPayment._id.toHexString() },
      }),
    );
    expect(succeededPayment.status).toBe(PaymentStatus.Finalized);
  });

  function createOrderDocument(overrides: Partial<TestOrderDocument> = {}): TestOrderDocument {
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

  function createPaymentDocument(
    overrides: Partial<TestPaymentDocument> = {},
  ): TestPaymentDocument {
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
