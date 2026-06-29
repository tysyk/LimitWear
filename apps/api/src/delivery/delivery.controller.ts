import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NovaPoshtaService } from './nova-poshta.service';

@ApiTags('Delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly novaPoshtaService: NovaPoshtaService) {}

  @ApiOperation({ summary: 'Search Nova Poshta cities for checkout autocomplete' })
  @Get('cities')
  searchCities(@Query('search') search = '') {
    return this.novaPoshtaService.searchCities(search);
  }

  @ApiOperation({ summary: 'List Nova Poshta warehouses by city ref' })
  @Get('warehouses')
  getWarehouses(@Query('cityRef') cityRef = '') {
    return this.novaPoshtaService.getWarehouses(cityRef);
  }
}
