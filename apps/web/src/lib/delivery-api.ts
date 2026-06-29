import { sendRequest } from './auth-api';

export interface DeliveryCity {
  ref: string;
  name: string;
  area?: string;
}

export interface DeliveryWarehouse {
  ref: string;
  name: string;
  number?: string;
  type?: string;
}

export interface CreateTtnPayload {
  weight: number;
  seatsAmount: number;
  description: string;
  cost: number;
}

export interface DeliveryRecord {
  _id?: string;
  trackingNumber?: string;
  novaPostDocumentRef?: string;
  status: string;
  recipientName: string;
  recipientPhone: string;
  cityName: string;
  warehouseName: string;
  deliveryType: string;
  ttnCreatedAt?: string;
}

export async function searchDeliveryCities(search: string): Promise<DeliveryCity[]> {
  return sendRequest<DeliveryCity[]>(`/delivery/cities?search=${encodeURIComponent(search)}`, {
    method: 'GET',
  });
}

export async function getDeliveryWarehouses(cityRef: string): Promise<DeliveryWarehouse[]> {
  return sendRequest<DeliveryWarehouse[]>(
    `/delivery/warehouses?cityRef=${encodeURIComponent(cityRef)}`,
    {
      method: 'GET',
    },
  );
}

export async function createTtnForOrder(
  orderId: string,
  payload: CreateTtnPayload,
): Promise<DeliveryRecord> {
  return sendRequest<DeliveryRecord>(`/admin/delivery/${encodeURIComponent(orderId)}/create-ttn`, {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}
