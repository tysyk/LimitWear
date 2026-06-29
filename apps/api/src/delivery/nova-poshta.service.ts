import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NovaPoshtaCity {
  ref: string;
  name: string;
  area?: string;
}

export interface NovaPoshtaWarehouse {
  ref: string;
  name: string;
  number?: string;
  type?: string;
}

export interface CreateTtnInput {
  orderId: string;
  recipientName: string;
  recipientPhone: string;
  cityRef: string;
  warehouseRef: string;
  weight: number;
  seatsAmount: number;
  description: string;
  cost: number;
}

export interface CreateTtnResult {
  trackingNumber: string;
  documentRef: string;
}

export interface TrackingStatus {
  trackingNumber: string;
  status: string;
  statusCode?: string;
}

interface NovaPoshtaResponse<T> {
  success: boolean;
  data: T[];
  errors?: string[];
  warnings?: string[];
}

@Injectable()
export class NovaPoshtaService {
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>(
      'NOVA_POSHTA_API_URL',
      'https://api.novaposhta.ua/v2.0/json/',
    );
  }

  async searchCities(search: string): Promise<NovaPoshtaCity[]> {
    const normalizedSearch = search.trim();
    if (normalizedSearch.length < 2) {
      throw new BadRequestException('City search must contain at least 2 characters.');
    }

    const response = await this.request<{
      Ref: string;
      Description: string;
      AreaDescription?: string;
    }>('Address', 'getCities', {
      FindByString: normalizedSearch,
      Limit: '20',
    });

    return response.map((city) => ({
      ref: city.Ref,
      name: city.Description,
      area: city.AreaDescription,
    }));
  }

  async getWarehouses(cityRef: string): Promise<NovaPoshtaWarehouse[]> {
    const normalizedCityRef = cityRef.trim();
    if (!normalizedCityRef) {
      throw new BadRequestException('cityRef is required.');
    }

    const response = await this.request<{
      Ref: string;
      Description: string;
      Number?: string;
      TypeOfWarehouse?: string;
    }>('Address', 'getWarehouses', {
      CityRef: normalizedCityRef,
      Limit: '50',
    });

    return response.map((warehouse) => ({
      ref: warehouse.Ref,
      name: warehouse.Description,
      number: warehouse.Number,
      type: warehouse.TypeOfWarehouse,
    }));
  }

  async createTtn(input: CreateTtnInput): Promise<CreateTtnResult> {
    const response = await this.request<{
      IntDocNumber: string;
      Ref: string;
    }>('InternetDocument', 'save', {
      OrderId: input.orderId,
      RecipientName: input.recipientName,
      RecipientPhone: input.recipientPhone,
      CityRecipient: input.cityRef,
      RecipientAddress: input.warehouseRef,
      Weight: input.weight.toString(),
      SeatsAmount: input.seatsAmount.toString(),
      Description: input.description,
      Cost: input.cost.toString(),
    });
    const document = response[0];

    if (!document) {
      throw new BadGatewayException('Nova Poshta did not return TTN data.');
    }

    return {
      trackingNumber: document.IntDocNumber,
      documentRef: document.Ref,
    };
  }

  async checkTracking(trackingNumber: string): Promise<TrackingStatus> {
    const normalizedTrackingNumber = trackingNumber.trim();
    if (!normalizedTrackingNumber) {
      throw new BadRequestException('trackingNumber is required.');
    }

    const response = await this.request<{
      Number: string;
      Status: string;
      StatusCode?: string;
    }>('TrackingDocument', 'getStatusDocuments', {
      Documents: [{ DocumentNumber: normalizedTrackingNumber }],
    });
    const tracking = response[0];

    if (!tracking) {
      throw new BadGatewayException('Nova Poshta did not return tracking data.');
    }

    return {
      trackingNumber: tracking.Number,
      status: tracking.Status,
      statusCode: tracking.StatusCode,
    };
  }

  private async request<T>(
    modelName: string,
    calledMethod: string,
    methodProperties: Record<string, unknown>,
  ): Promise<T[]> {
    const apiKey = this.configService.get<string>('NOVA_POSHTA_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException('Nova Poshta API key is not configured.');
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        modelName,
        calledMethod,
        methodProperties,
      }),
    });

    if (!response.ok) {
      throw new BadGatewayException('Nova Poshta request failed.');
    }

    const payload = (await response.json()) as NovaPoshtaResponse<T>;
    if (!payload.success) {
      throw new BadGatewayException('Nova Poshta returned an error.');
    }

    return payload.data;
  }
}
