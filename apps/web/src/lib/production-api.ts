import { sendRequest } from './auth-api';

export type ProductionPackageStatus =
  | 'draft'
  | 'ready_for_production'
  | 'sent_to_producer'
  | 'in_production'
  | 'completed'
  | 'ready_to_ship'
  | 'problem'
  | 'cancelled';

export interface ProductionPackageRecord {
  _id?: string;
  dropId: string;
  designId: string;
  status: ProductionPackageStatus;
  productType: string;
  productColor?: string;
  material?: string;
  totalQuantity: number;
  sizeBreakdown: Record<string, number>;
  productionFileIds: string[];
  mockupIds: string[];
  orderIds: string[];
  notes?: string;
  sentToProducerAt?: string;
  completedAt?: string;
  readyToShipAt?: string;
}

export async function getProductionPackages(): Promise<ProductionPackageRecord[]> {
  return sendRequest<ProductionPackageRecord[]>('/admin/production', {
    method: 'GET',
  });
}

export async function getProductionPackage(id: string): Promise<ProductionPackageRecord> {
  return sendRequest<ProductionPackageRecord>(`/admin/production/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export async function transitionProductionPackage(
  id: string,
  status: ProductionPackageStatus,
  notes?: string,
): Promise<ProductionPackageRecord> {
  return sendRequest<ProductionPackageRecord>(
    `/admin/production/${encodeURIComponent(id)}/transition`,
    {
      body: JSON.stringify({
        status,
        notes,
      }),
      method: 'POST',
    },
  );
}
