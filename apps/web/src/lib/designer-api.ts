import { sendRequest } from './auth-api';

export interface DesignerApplicationPayload {
  displayName: string;
  slug: string;
  bio?: string;
  portfolioLinks?: string[];
  message?: string;
  fileIds?: string[];
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

export interface FileAsset {
  id?: string;
  _id?: string;
  originalName: string;
  category: string;
  visibility: string;
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

export async function uploadDesignerApplicationFile(file: File): Promise<FileAsset> {
  return sendFile<FileAsset>('/designer/application-files', file);
}

export async function uploadDesignerDesignFile(
  designId: string,
  category: 'design_original' | 'design_preview' | 'mockup',
  file: File,
): Promise<FileAsset> {
  return sendFile<FileAsset>(`/designer/designs/${designId}/files/${category}`, file);
}

export function getEntityId(entity: { id?: string; _id?: string }): string {
  return entity.id ?? entity._id ?? '';
}

async function sendFile<TResponse>(path: string, file: File): Promise<TResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return sendRequest<TResponse>(path, {
    body: formData,
    method: 'POST',
  });
}
