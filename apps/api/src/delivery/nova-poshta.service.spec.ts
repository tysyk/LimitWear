import {
  BadGatewayException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NovaPoshtaService } from './nova-poshta.service';

describe('NovaPoshtaService', () => {
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
    return new NovaPoshtaService(
      new ConfigService({
        NOVA_POSHTA_API_KEY: 'np-key',
        NOVA_POSHTA_API_URL: 'https://np.test/json',
        ...config,
      }),
    );
  }

  it('searches cities through the backend-only Nova Poshta key', async () => {
    mockNovaPoshtaResponse([
      {
        Ref: 'city-ref',
        Description: 'Kyiv',
        AreaDescription: 'Kyivska',
      },
    ]);

    await expect(createService().searchCities('Kyiv')).resolves.toEqual([
      {
        ref: 'city-ref',
        name: 'Kyiv',
        area: 'Kyivska',
      },
    ]);

    const [, requestInit] = fetchMock.mock.calls[0];
    const body = JSON.parse(requestInit?.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      apiKey: 'np-key',
      modelName: 'Address',
      calledMethod: 'getCities',
    });
    expect(body.methodProperties).toMatchObject({
      FindByString: 'Kyiv',
    });
  });

  it('gets warehouses by city ref', async () => {
    mockNovaPoshtaResponse([
      {
        Ref: 'warehouse-ref',
        Description: 'Warehouse #1',
        Number: '1',
        TypeOfWarehouse: 'Warehouse',
      },
    ]);

    await expect(createService().getWarehouses('city-ref')).resolves.toEqual([
      {
        ref: 'warehouse-ref',
        name: 'Warehouse #1',
        number: '1',
        type: 'Warehouse',
      },
    ]);
  });

  it('creates TTN and checks tracking through provider methods', async () => {
    mockNovaPoshtaResponse([
      {
        IntDocNumber: '20450000000000',
        Ref: 'document-ref',
      },
    ]);

    await expect(
      createService().createTtn({
        orderId: 'order-id',
        recipientName: 'Buyer',
        recipientPhone: '+380991234567',
        cityRef: 'city-ref',
        warehouseRef: 'warehouse-ref',
        weight: 1,
        seatsAmount: 1,
        description: 'LimitWear order',
        cost: 2200,
      }),
    ).resolves.toEqual({
      trackingNumber: '20450000000000',
      documentRef: 'document-ref',
    });

    mockNovaPoshtaResponse([
      {
        Number: '20450000000000',
        Status: 'Delivered',
        StatusCode: '9',
      },
    ]);

    await expect(createService().checkTracking('20450000000000')).resolves.toEqual({
      trackingNumber: '20450000000000',
      status: 'Delivered',
      statusCode: '9',
    });
  });

  it('validates inputs and handles configuration/provider failures', async () => {
    await expect(createService().searchCities('K')).rejects.toThrow(BadRequestException);
    await expect(createService().getWarehouses('')).rejects.toThrow(BadRequestException);
    await expect(createService().checkTracking('')).rejects.toThrow(BadRequestException);
    await expect(new NovaPoshtaService(new ConfigService()).searchCities('Kyiv')).rejects.toThrow(
      InternalServerErrorException,
    );

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: jest.fn(),
    } as unknown as Response);
    await expect(createService().searchCities('Kyiv')).rejects.toThrow(BadGatewayException);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        success: false,
        data: [],
        errors: ['Invalid API key'],
      }),
    } as unknown as Response);
    await expect(createService().searchCities('Kyiv')).rejects.toThrow(BadGatewayException);
  });

  function mockNovaPoshtaResponse(data: unknown[]): void {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        success: true,
        data,
      }),
    } as unknown as Response);
  }
});
