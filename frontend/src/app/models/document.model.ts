export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'archived';

export interface DocumentItem {
  id: number;
  title: string;
  description: string;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
}

export interface DocumentFormData {
  title: string;
  description: string;
  status: DocumentStatus;
}
