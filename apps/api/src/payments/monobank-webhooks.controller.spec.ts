import { MonobankWebhooksController } from './monobank-webhooks.controller';
import { PaymentsService } from './payments.service';

describe('MonobankWebhooksController', () => {
  let controller: MonobankWebhooksController;
  let paymentsService: jest.Mocked<Pick<PaymentsService, 'handleMonobankWebhook'>>;

  beforeEach(() => {
    paymentsService = {
      handleMonobankWebhook: jest.fn(),
    };
    controller = new MonobankWebhooksController(paymentsService as unknown as PaymentsService);
  });

  it('delegates Monobank webhook handling to the payments service', async () => {
    const dto = {
      invoiceId: 'invoice-id',
      status: 'hold_created',
    };
    const headers = {
      'x-limitwear-webhook-secret': 'secret',
    };
    paymentsService.handleMonobankWebhook.mockResolvedValue({
      ok: true,
      duplicate: false,
      paymentId: 'payment-id',
    });

    await expect(controller.handleMonobankWebhook(dto, headers)).resolves.toEqual({
      ok: true,
      duplicate: false,
      paymentId: 'payment-id',
    });
    expect(paymentsService.handleMonobankWebhook).toHaveBeenCalledWith(dto, headers);
  });
});
