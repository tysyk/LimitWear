import { sendRequest } from './auth-api';

export interface AnalyticsPayoutTotals {
  pendingAmount: number;
  paidAmount: number;
  readyToPayAmount: number;
}

export interface DesignerAnalytics {
  designerProfileId?: string;
  designs: {
    total: number;
    approved: number;
  };
  drops: {
    total: number;
    successful: number;
  };
  orders: {
    soldUnits: number;
  };
  revenue: {
    gross: number;
    currency: string;
  };
  payouts: AnalyticsPayoutTotals;
}

export interface AdminAnalytics {
  users: {
    total: number;
    designers: number;
    active: number;
    blocked: number;
  };
  drops: {
    total: number;
    active: number;
    successful: number;
    failed: number;
  };
  orders: {
    total: number;
    paid: number;
    returned: number;
    soldUnits: number;
  };
  revenue: {
    gross: number;
    returns: number;
    net: number;
    currency: string;
  };
  secondChance: {
    soldListings: number;
    revenue: number;
    soldUnits: number;
  };
  payouts: AnalyticsPayoutTotals;
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  return sendRequest<AdminAnalytics>('/admin/analytics', {
    method: 'GET',
  });
}

export async function getDesignerAnalytics(): Promise<DesignerAnalytics> {
  return sendRequest<DesignerAnalytics>('/designer/analytics', {
    method: 'GET',
  });
}
