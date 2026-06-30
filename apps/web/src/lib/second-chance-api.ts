import { sendRequest } from './auth-api';

export type SecondChanceListingStatus =
  | 'draft'
  | 'wishlist_priority'
  | 'public_available'
  | 'reserved'
  | 'sold'
  | 'expired'
  | 'cancelled';

export interface SecondChanceListingRecord {
  _id?: string;
  dropId: string;
  sourceOrderId?: string;
  size: string;
  quantity: number;
  price: number;
  currency: string;
  status: SecondChanceListingStatus;
  priorityWindowUntil?: string;
  publicAvailableAt?: string;
  soldAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSecondChanceListingPayload {
  dropId: string;
  sourceOrderId?: string;
  size: string;
  quantity: number;
  price: number;
  currency?: string;
  priorityWindowUntil?: string;
  publicAvailableAt?: string;
}

export function getSecondChanceListings(): Promise<SecondChanceListingRecord[]> {
  return sendRequest<SecondChanceListingRecord[]>('/admin/second-chance', {
    method: 'GET',
  });
}

export function createSecondChanceListing(
  payload: CreateSecondChanceListingPayload,
): Promise<SecondChanceListingRecord> {
  return sendRequest<SecondChanceListingRecord>('/admin/second-chance', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export function setSecondChancePriority(
  id: string,
  priorityWindowUntil: string,
): Promise<SecondChanceListingRecord> {
  return sendRequest<SecondChanceListingRecord>(
    `/admin/second-chance/${encodeURIComponent(id)}/priority`,
    {
      body: JSON.stringify({ priorityWindowUntil }),
      method: 'POST',
    },
  );
}

export function makeSecondChancePublic(
  id: string,
  publicAvailableAt?: string,
): Promise<SecondChanceListingRecord> {
  return sendRequest<SecondChanceListingRecord>(
    `/admin/second-chance/${encodeURIComponent(id)}/public`,
    {
      body: JSON.stringify({ publicAvailableAt }),
      method: 'POST',
    },
  );
}

export function markSecondChanceSold(id: string): Promise<SecondChanceListingRecord> {
  return sendSecondChanceAction(id, 'sold');
}

export function expireSecondChanceListing(id: string): Promise<SecondChanceListingRecord> {
  return sendSecondChanceAction(id, 'expire');
}

export function cancelSecondChanceListing(id: string): Promise<SecondChanceListingRecord> {
  return sendSecondChanceAction(id, 'cancel');
}

function sendSecondChanceAction(
  id: string,
  action: 'sold' | 'expire' | 'cancel',
): Promise<SecondChanceListingRecord> {
  return sendRequest<SecondChanceListingRecord>(
    `/admin/second-chance/${encodeURIComponent(id)}/${action}`,
    {
      method: 'POST',
    },
  );
}
