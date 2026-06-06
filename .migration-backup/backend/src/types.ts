export type DocumentCategory =
  | 'receipt'
  | 'contract'
  | 'id'
  | 'warranty'
  | 'medical'
  | 'tax'
  | 'other';

export type OCRStatus = 'pending' | 'processing' | 'done' | 'failed' | 'unavailable';

export type DocumentRecord = {
  id: string;
  title: string;
  category: DocumentCategory;
  fileUri?: string;
  thumbnailUri?: string | null;
  mimeType: string;
  fileSizeBytes: number;
  pageCount: number;
  ocrText?: string;
  ocrStatus: OCRStatus;
  inferredDate?: string;
  amounts?: number[];
  vendor?: string;
  isFavorite: boolean;
  folderId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  syncVersion?: number;
};

export type FolderRecord = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  syncVersion?: number;
};

export type TombstoneRecord = {
  id: string;
  kind: 'document' | 'folder';
  deletedAt: string;
  syncVersion: number;
};

export type ShareLinkRecord = {
  token: string;
  documentId: string;
  title: string;
  expiresAt: string;
  passwordProtected: boolean;
  createdAt: string;
};

export type ShareLinkCreateInput = {
  documentId: string;
  title: string;
  expiresAt: string;
  passwordHash?: string;
};

export type ShareLinkStoreRecord = ShareLinkRecord & {
  passwordHash?: string;
};

export type EmailInboundRecord = {
  id: string;
  sender: string;
  subject: string;
  receivedAt: string;
  attachments: Array<{
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }>;
};

export type AnalyticsRecord = {
  id: string;
  event: string;
  deviceId?: string;
  userId?: string;
  properties?: Record<string, string | number | boolean>;
  createdAt: string;
};

export type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  provider: 'email' | 'apple';
  appleUserId?: string;
  isPro: boolean;
  createdAt: string;
};

export type AppData = {
  syncVersion: number;
  documents: Record<string, DocumentRecord>;
  folders: Record<string, FolderRecord>;
  tombstones: TombstoneRecord[];
  shareLinks: Record<string, ShareLinkStoreRecord>;
  inboundEmails: Record<string, EmailInboundRecord>;
  analytics: AnalyticsRecord[];
  users: Record<string, UserRecord>;
};
