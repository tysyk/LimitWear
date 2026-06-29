import { sendRequest } from './auth-api';

export interface CreateOrderPayload {
  dropId: string;
  size: string;
  quantity: number;
  recipientName: string;
  recipientPhone: string;
  cityRef: string;
  cityName: string;
  warehouseRef: string;
  warehouseName: string;
  deliveryType: 'warehouse' | 'postomat' | 'courier';
}

export interface OrderRecord {
  _id?: string;
  status: string;
  quantity: number;
  size: string;
  recipientName: string;
  recipientPhone: string;
  deliveryData: {
    cityRef: string;
    cityName: string;
    warehouseRef: string;
    warehouseName: string;
    deliveryType: string;
  };
  deliveryId?: string;
}

export async function createOrder(payload: CreateOrderPayload): Promise<OrderRecord> {
  return sendRequest<OrderRecord>('/orders', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}
