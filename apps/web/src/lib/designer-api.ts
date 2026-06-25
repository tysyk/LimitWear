import { sendRequest } from './auth-api';

export interface DesignerApplicationPayload {
  displayName: string;
  slug: string;
  bio?: string;
  portfolioLinks?: string[];
  message?: string;
}

export interface DesignPayload {
  title: string;
  slug?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface DesignerRequest {
  id?: string;
  _id?: string;
  status: string;
  title: string;
}

export interface DesignerDesign {
  id?: string;
  _id?: string;
  title: string;
  slug?: string;
  description?: string;
  category?: string;
  tags?: string[];
  status: string;
  adminComment?: string;
  rejectionReason?: string;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function applyDesigner(payload: DesignerApplicationPayload): Promise<DesignerRequest> {
  return sendRequest<DesignerRequest>('/designer/apply', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export async function getDesignerDesigns(): Promise<DesignerDesign[]> {
  return sendRequest<DesignerDesign[]>('/designer/designs', {
    method: 'GET',
  });
}

export async function createDesignerDesign(payload: DesignPayload): Promise<DesignerDesign> {
  return sendRequest<DesignerDesign>('/designer/designs', {
    body: JSON.stringify(payload),
    method: 'POST',
  });
}

export async function submitDesignerDesign(designId: string): Promise<DesignerDesign> {
  return sendRequest<DesignerDesign>(`/designer/designs/${designId}/submit`, {
    method: 'POST',
  });
}

export function getEntityId(entity: { id?: string; _id?: string }): string {
  return entity.id ?? entity._id ?? '';
}
