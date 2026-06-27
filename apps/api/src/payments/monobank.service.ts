import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CreateMonobankHoldInvoiceInput {
  orderId: string;
  amount: number;
  currency: string;
  redirectUrl?: string;
}

export interface MonobankInvoiceResponse {
  invoiceId: string;
  pageUrl: string;
}

export interface MonobankInvoiceStatus {
  invoiceId: string;
  status: string;
  amount?: number;
  currency?: string;
  paymentInfo?: string;
  modifiedDate?: number;
}

@Injectable()
export class MonobankService {
  private readonly apiBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiBaseUrl = this.configService
      .get<string>('MONO_API_BASE_URL', 'https://api.monobank.ua/api/merchant')
      .replace(/\/$/, '');
  }

  async createHoldInvoice(input: CreateMonobankHoldInvoiceInput): Promise<MonobankInvoiceResponse> {
    const payload = {
      amount: Math.round(input.amount * 100),
      ccy: this.toCurrencyCode(input.currency),
      merchantPaymInfo: {
        reference: input.orderId,
        destination: `LimitWear order ${input.orderId}`,
      },
      redirectUrl: input.redirectUrl,
      webHookUrl: this.configService.get<string>('MONO_WEBHOOK_URL'),
      paymentType: 'hold',
    };

    return this.request<MonobankInvoiceResponse>('/invoice/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async checkStatus(invoiceId: string): Promise<MonobankInvoiceStatus> {
    return this.request<MonobankInvoiceStatus>(
      `/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`,
      {
        method: 'GET',
      },
    );
  }

  async finalizeHold(invoiceId: string): Promise<void> {
    await this.request<unknown>('/invoice/finalize', {
      method: 'POST',
      body: JSON.stringify({
        invoiceId,
      }),
    });
  }

  async cancelHold(invoiceId: string): Promise<void> {
    await this.request<unknown>('/invoice/cancel', {
      method: 'POST',
      body: JSON.stringify({
        invoiceId,
      }),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const token = this.configService.get<string>('MONO_TOKEN');

    if (!token) {
      throw new InternalServerErrorException('Monobank token is not configured.');
    }

    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Token': token,
        ...init.headers,
      },
    });

    if (!response.ok) {
      throw new BadGatewayException('Monobank request failed.');
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private toCurrencyCode(currency: string): number {
    if (currency.toUpperCase() !== 'UAH') {
      throw new InternalServerErrorException('Unsupported payment currency.');
    }

    return 980;
  }
}
