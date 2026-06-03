export type DocumentType =
  | 'receipt'
  | 'contract'
  | 'id'
  | 'warranty'
  | 'medical'
  | 'insurance'
  | 'tax'
  | 'invoice'
  | 'personal'
  | 'other';

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  uri: string;              // local file URI
  thumbnailUri?: string;
  ocrText?: string;         // extracted text from OCR
  folderId?: string;
  tags: string[];
  notes?: string;
  expiryDate?: string;      // ISO date string
  reminderDate?: string;    // ISO date string
  isFavorited: boolean;
  isEncrypted: boolean;
  fileSize: number;         // bytes
  mimeType: string;
  pageCount?: number;
  createdAt: string;        // ISO datetime
  updatedAt: string;        // ISO datetime
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  documentId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  documentId: string;
  title: string;
  date: string;             // ISO datetime
  notificationId?: string;
  isCompleted: boolean;
  createdAt: string;
}
