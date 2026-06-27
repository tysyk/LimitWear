import { BadGatewayException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MonobankService } from './monobank.service';

describe('MonobankService', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  function createService(config: Record<string, string> = {}) {
    return new MonobankService(
      new ConfigService({
        MONO_TOKEN: 'secret-token',
        MONO_WEBHOOK_URL: 'https://api.limitwear.test/webhooks/monobank',
        MONO_API_BASE_URL: 'https://mono.test',
        ...config,
      }),
    );
  }

  it('creates a hold invoice without exposing the token in payload', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        invoiceId: 'invoice-id',
        pageUrl: 'https://pay.mono.test/invoice-id',
      }),
    } as unknown as Response);
    const service = createService();

    await expect(
      service.createHoldInvoice({
        orderId: 'order-id',
        amount: 2200,
        currency: 'UAH',
      }),
    ).resolves.toEqual({
      invoiceId: 'invoice-id',
      pageUrl: 'https://pay.mono.test/invoice-id',
    });

    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    expect(requestUrl).toBe('https://mono.test/invoice/create');
    expect(requestInit).toBeDefined();
    if (!requestInit) throw new Error('Expected fetch init');
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.headers).toMatchObject({
      'X-Token': 'secret-token',
    });
    const requestBody = requestInit.body as string;
    expect(requestBody).toContain('"paymentType":"hold"');
    expect(requestBody).toContain('"amount":220000');
    expect(requestBody).not.toContain('secret-token');
  });

  it('checks invoice status', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        invoiceId: 'invoice-id',
        status: 'hold_created',
      }),
    } as unknown as Response);

    await expect(createService().checkStatus('invoice-id')).resolves.toEqual({
      invoiceId: 'invoice-id',
      status: 'hold_created',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://mono.test/invoice/status?invoiceId=invoice-id',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('finalizes and cancels holds', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: jest.fn(),
    } as unknown as Response);
    const service = createService();

    await expect(service.finalizeHold('invoice-id')).resolves.toBeUndefined();
    await expect(service.cancelHold('invoice-id')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://mono.test/invoice/finalize',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://mono.test/invoice/cancel',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fails safely when token is missing or provider rejects the request', async () => {
    await expect(
      new MonobankService(
        new ConfigService({ MONO_API_BASE_URL: 'https://mono.test' }),
      ).checkStatus('invoice-id'),
    ).rejects.toThrow(InternalServerErrorException);

    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn(),
    } as unknown as Response);
    await expect(createService().checkStatus('invoice-id')).rejects.toThrow(BadGatewayException);
  });
});
