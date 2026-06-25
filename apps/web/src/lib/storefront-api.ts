const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export interface StorefrontDrop {
  _id?: string;
  dropNumber: string;
  title: string;
  slug: string;
  description?: string;
  productType: string;
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
  status: string;
  startsAt?: string;
  endsAt?: string;
  completedAt?: string;
  failedAt?: string;
  foreverClosedAt?: string;
}

export interface StorefrontCollection {
  _id?: string;
  title: string;
  slug: string;
  description?: string;
  featured: boolean;
  publishedAt?: string;
}

export interface StorefrontDesigner {
  _id?: string;
  displayName: string;
  slug: string;
  bio?: string;
  socialLinks?: Record<string, string>;
  portfolioLinks?: string[];
}

export interface StorefrontData {
  drops: StorefrontDrop[];
  collections: StorefrontCollection[];
  designers: StorefrontDesigner[];
}

export async function getStorefrontData(): Promise<StorefrontData> {
  const [drops, collections, designers] = await Promise.all([
    sendStorefrontRequest<StorefrontDrop[]>('/drops'),
    sendStorefrontRequest<StorefrontCollection[]>('/collections'),
    sendStorefrontRequest<StorefrontDesigner[]>('/designers'),
  ]);

  return { drops, collections, designers };
}

export async function getDrop(slug: string): Promise<StorefrontDrop> {
  return sendStorefrontRequest<StorefrontDrop>(`/drops/${encodeURIComponent(slug)}`);
}

export async function getRelatedDrops(slug: string): Promise<StorefrontDrop[]> {
  return sendStorefrontRequest<StorefrontDrop[]>(`/drops/${encodeURIComponent(slug)}/related`);
}

async function sendStorefrontRequest<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Storefront request failed with status ${response.status}`);
  }

  return (await response.json()) as TResponse;
}
