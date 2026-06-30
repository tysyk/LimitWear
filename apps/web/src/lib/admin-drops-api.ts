import { sendRequest } from './auth-api';

export type DropStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'ready_for_launch'
  | 'active_collecting'
  | 'guaranteed'
  | 'sold_out'
  | 'successful'
  | 'failed'
  | 'in_production'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'second_chance_window'
  | 'forever_closed'
  | 'cancelled'
  | 'archived';

export type ProductType = 'tshirt' | 'hoodie' | 'sweatshirt' | 'longsleeve' | 'cap';

export interface AdminDropRecord {
  _id?: string;
  dropNumber: string;
  designId: string;
  designerId?: string;
  collectionId?: string;
  title: string;
  slug: string;
  description?: string;
  productType: ProductType;
  productColor?: string;
  productBase?: string;
  material?: string;
  price: number;
  currency: string;
  designerRevenuePercent: number;
  minQuantity: number;
  maxQuantity: number;
  currentQuantity: number;
  finalQuantity?: number;
  sizeOptions: string[];
  sizeBreakdown?: Record<string, number>;
  status: DropStatus;
  startsAt?: string;
  endsAt?: string;
  completedAt?: string;
  failedAt?: string;
  foreverClosedAt?: string;
}

export interface AdminDropPayload {
  designId: string;
  dropNumber: string;
  title: string;
  slug: string;
  productType: ProductType;
  price: number;
  designerRevenuePercent: number;
  minQuantity: number;
  maxQuantity: number;
  sizeOptions: string[];
  startsAt: string;
  endsAt: string;
  description?: string;
  productColor?: string;
  productBase?: string;
  material?: string;
}

export function getAdminDrops(): Promise<AdminDropRecord[]> {
  return sendRequest<AdminDropRecord[]>('/admin/drops', {
    method: 'GET',
  });
}

export function getAdminDrop(id: string): Promise<AdminDropRecord> {
  return sendRequest<AdminDropRecord>(`/admin/drops/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export function createAdminDrop(payload: AdminDropPayload): Promise<AdminDropRecord> {
  return sendRequest<AdminDropRecord>('/admin/drops', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export function updateAdminDrop(
  id: string,
  payload: Partial<AdminDropPayload>,
): Promise<AdminDropRecord> {
  return sendRequest<AdminDropRecord>(`/admin/drops/${encodeURIComponent(id)}`, {
    body: JSON.stringify(payload),
    method: 'PATCH',
  });
}

export function launchAdminDrop(id: string): Promise<AdminDropRecord> {
  return sendRequest<AdminDropRecord>(`/admin/drops/${encodeURIComponent(id)}/launch`, {
    method: 'POST',
  });
}

export function transitionAdminDrop(id: string, status: DropStatus): Promise<AdminDropRecord> {
  return sendRequest<AdminDropRecord>(`/admin/drops/${encodeURIComponent(id)}/transition`, {
    body: JSON.stringify({ status }),
    method: 'POST',
  });
}
