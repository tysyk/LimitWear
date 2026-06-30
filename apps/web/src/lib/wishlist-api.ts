import { sendRequest } from './auth-api';

export type WishlistItemStatus = 'active' | 'closed' | 'archived';

export interface WishlistItem {
  _id?: string;
  userId: string;
  dropId: string;
  status: WishlistItemStatus;
  notifyLowStock: boolean;
  notifySecondChance: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateWishlistItemPayload {
  status?: WishlistItemStatus;
  notifyLowStock?: boolean;
  notifySecondChance?: boolean;
}

export function getWishlist(): Promise<WishlistItem[]> {
  return sendRequest<WishlistItem[]>('/wishlist', {
    method: 'GET',
  });
}

export function addWishlistItem(dropId: string): Promise<WishlistItem> {
  return sendRequest<WishlistItem>(`/wishlist/${encodeURIComponent(dropId)}`, {
    method: 'POST',
  });
}

export function closeWishlistItem(dropId: string): Promise<WishlistItem> {
  return sendRequest<WishlistItem>(`/wishlist/${encodeURIComponent(dropId)}`, {
    method: 'DELETE',
  });
}

export function updateWishlistItem(
  dropId: string,
  payload: UpdateWishlistItemPayload,
): Promise<WishlistItem> {
  return sendRequest<WishlistItem>(`/wishlist/${encodeURIComponent(dropId)}/settings`, {
    body: JSON.stringify(payload),
    method: 'PATCH',
  });
}
