import { ConfigService } from '@nestjs/config';
import { EmailProviderService } from './email-provider.service';

describe('EmailProviderService', () => {
  const input = {
    to: 'customer@example.com',
    subject: 'Order update',
    text: 'Your order was updated.',
    metadata: {
      orderId: 'order-id',
    },
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends transactional email through the configured provider', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messageId: 'provider-message-id' }), {
        status: 202,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
    const service = new EmailProviderService(
      new ConfigService({
        EMAIL_PROVIDER_API_URL: 'https://email.example/send',
        EMAIL_PROVIDER_API_KEY: 'email-api-key',
        EMAIL_FROM: 'noreply@limitwear.example',
      }),
    );

    await expect(service.sendTransactional(input)).resolves.toEqual({
      status: 'sent',
      providerMessageId: 'provider-message-id',
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://email.example/send');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      Authorization: 'Bearer email-api-key',
      'Content-Type': 'application/json',
    });
    expect(init.body).toContain('"to":"customer@example.com"');
  });

  it('logs and returns failed when provider rejects the request', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('quota exceeded', { status: 429 }));
    const service = new EmailProviderService(
      new ConfigService({
        EMAIL_PROVIDER_API_URL: 'https://email.example/send',
        EMAIL_PROVIDER_API_KEY: 'email-api-key',
        EMAIL_FROM: 'noreply@limitwear.example',
      }),
    );

    await expect(service.sendTransactional(input)).resolves.toEqual({
      status: 'failed',
      error: 'provider_status_429',
    });
  });

  it('skips without throwing when provider config is missing', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    const service = new EmailProviderService(new ConfigService());

    await expect(service.sendTransactional(input)).resolves.toEqual({
      status: 'skipped',
      error: 'email_provider_not_configured',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
