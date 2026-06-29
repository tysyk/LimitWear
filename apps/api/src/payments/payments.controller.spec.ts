import { UserRole, UserStatus } from '@limitwear/shared';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<Pick<PaymentsService, 'createPaymentHold'>>;

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

  beforeEach(() => {
    paymentsService = {
      createPaymentHold: jest.fn(),
    };
    controller = new PaymentsController(paymentsService as unknown as PaymentsService);
  });

  it('delegates hold creation to the payments service for the authenticated user', async () => {
    const response = {
      paymentId: 'payment-id',
      orderId: 'order-id',
      providerInvoiceId: 'invoice-id',
      paymentUrl: 'https://pay.mono.test/invoice-id',
      holdExpiresAt: new Date(),
    };
    paymentsService.createPaymentHold.mockResolvedValue(response);

    await expect(controller.createHold({ orderId: 'order-id' }, request)).resolves.toBe(response);
    expect(paymentsService.createPaymentHold).toHaveBeenCalledWith(request.user, {
      orderId: 'order-id',
    });
  });
});
