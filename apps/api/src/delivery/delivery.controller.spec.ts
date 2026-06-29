import { DeliveryController } from './delivery.controller';
import { NovaPoshtaService } from './nova-poshta.service';

describe('DeliveryController', () => {
  let controller: DeliveryController;
  let novaPoshtaService: jest.Mocked<Pick<NovaPoshtaService, 'searchCities' | 'getWarehouses'>>;

  beforeEach(() => {
    novaPoshtaService = {
      searchCities: jest.fn(),
      getWarehouses: jest.fn(),
    };
    controller = new DeliveryController(novaPoshtaService as unknown as NovaPoshtaService);
  });

  it('delegates city search to Nova Poshta service', async () => {
    const cities = [{ ref: 'city-ref', name: 'Kyiv', area: 'Kyivska' }];
    novaPoshtaService.searchCities.mockResolvedValue(cities);

    await expect(controller.searchCities('Kyiv')).resolves.toBe(cities);
    expect(novaPoshtaService.searchCities).toHaveBeenCalledWith('Kyiv');
  });

  it('delegates warehouse lookup to Nova Poshta service', async () => {
    const warehouses = [{ ref: 'warehouse-ref', name: 'Warehouse #1' }];
    novaPoshtaService.getWarehouses.mockResolvedValue(warehouses);

    await expect(controller.getWarehouses('city-ref')).resolves.toBe(warehouses);
    expect(novaPoshtaService.getWarehouses).toHaveBeenCalledWith('city-ref');
  });
});
