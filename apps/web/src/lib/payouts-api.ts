import { sendRequest } from './auth-api';

export type PayoutStatus =
  | 'pending'
  | 'scheduled'
  | 'ready_to_pay'
  | 'partially_paid'
  | 'paid'
  | 'cancelled'
  | 'disputed';

export interface PayoutCalculationBase {
  soldUnits: number;
  returnedUnits: number;
  secondChanceSoldUnits: number;
  grossRevenue: number;
  returnedRevenue: number;
  secondChanceRevenue: number;
  netRevenue: number;
  eligibleOrderCount: number;
  returnWindowEndsAt?: string;
}

export interface PayoutRecord {
  _id?: string;
  designerId: string;
  dropId: string;
  amount: number;
  paidAmount: number;
  currency: string;
  designerRevenuePercent: number;
  calculationBase: PayoutCalculationBase;
  status: PayoutStatus;
  scheduledAt?: string;
  paidAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getAdminPayouts(): Promise<PayoutRecord[]> {
  return sendRequest<PayoutRecord[]>('/admin/payouts', {
    method: 'GET',
  });
}

export async function ensurePayoutForDrop(dropId: string): Promise<PayoutRecord> {
  return sendRequest<PayoutRecord>(`/admin/payouts/drops/${encodeURIComponent(dropId)}/ensure`, {
    method: 'POST',
  });
}

export async function markPayoutPaid(
  payoutId: string,
  payload: {
    amount?: number;
    notes?: string;
  },
): Promise<PayoutRecord> {
  return sendRequest<PayoutRecord>(`/admin/payouts/${encodeURIComponent(payoutId)}/mark-paid`, {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export async function getDesignerPayouts(): Promise<PayoutRecord[]> {
  return sendRequest<PayoutRecord[]>('/designer/payouts', {
    method: 'GET',
  });
}

export function formatMoney(amount: number, currency = 'UAH'): string {
  return new Intl.NumberFormat('uk-UA', {
    currency,
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(amount);
}
