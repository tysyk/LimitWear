import { PaymentStatus } from '@limitwear/shared';
import { Payment, PaymentProvider, PaymentSchema } from './payment.schema';

describe('PaymentSchema', () => {
  it('uses the payments collection with timestamps', () => {
    expect(PaymentSchema.get('collection')).toBe('payments');
    expect(PaymentSchema.get('timestamps')).toBe(true);
  });

  it('defines Monobank hold fields from the baseline', () => {
    expect(PaymentSchema.path('orderId').options.required).toBe(true);
    expect(PaymentSchema.path('userId').options.required).toBe(true);
    expect(PaymentSchema.path('dropId').options.required).toBe(true);
    expect(PaymentSchema.path('provider').options.enum).toEqual(Object.values(PaymentProvider));
    expect(PaymentSchema.path('provider').options.default).toBe(PaymentProvider.Monobank);
    expect(PaymentSchema.path('providerInvoiceId')).toBeDefined();
    expect(PaymentSchema.path('providerPaymentId')).toBeDefined();
    expect(PaymentSchema.path('invoiceUrl')).toBeDefined();
    expect(PaymentSchema.path('amount').options.required).toBe(true);
    expect(PaymentSchema.path('amount').options.min).toBe(0);
    expect(PaymentSchema.path('currency').options.default).toBe('UAH');
    expect(PaymentSchema.path('status').options.enum).toEqual(Object.values(PaymentStatus));
    expect(PaymentSchema.path('status').options.default).toBe(PaymentStatus.Created);
    expect(PaymentSchema.path('holdExpiresAt')).toBeDefined();
    expect(PaymentSchema.path('finalizedAt')).toBeDefined();
    expect(PaymentSchema.path('cancelledAt')).toBeDefined();
    expect(PaymentSchema.path('failedAt')).toBeDefined();
    expect(PaymentSchema.path('failureReason')).toBeDefined();
    expect(PaymentSchema.path('rawWebhookEvents')).toBeDefined();
  });

  it('indexes provider invoice id and operational payment queries', () => {
    expect(PaymentSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ providerInvoiceId: 1 }, expect.objectContaining({ unique: true, sparse: true })],
        [{ orderId: 1 }, expect.any(Object)],
        [{ userId: 1, createdAt: -1 }, expect.any(Object)],
        [{ dropId: 1 }, expect.any(Object)],
        [{ status: 1 }, expect.any(Object)],
        [{ holdExpiresAt: 1 }, expect.any(Object)],
        [{ 'rawWebhookEvents.eventId': 1 }, expect.any(Object)],
      ]),
    );
  });

  it('exposes the Payment class for Mongoose registration', () => {
    expect(Payment.name).toBe('Payment');
  });
});
