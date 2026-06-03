import type {
  AnalyticsRecord,
  DocumentRecord,
  EmailInboundRecord,
  FolderRecord,
  ShareLinkRecord,
  TombstoneRecord,
} from './types.js';

export type SyncPushInput = {
  documents: DocumentRecord[];
  folders: FolderRecord[];
  deletedDocumentIds: string[];
  deletedFolderIds: string[];
};

export type SyncPullOutput = {
  syncVersion: number;
  documents: DocumentRecord[];
  folders: FolderRecord[];
  tombstones: TombstoneRecord[];
};

export interface PapertrailStore {
  init(): Promise<void>;
  push(input: SyncPushInput): Promise<{ syncVersion: number }>;
  pull(sinceVersion: number): Promise<SyncPullOutput>;
  createShareLink(input: Omit<ShareLinkRecord, 'token' | 'createdAt'>): Promise<ShareLinkRecord>;
  getShareLink(token: string): Promise<ShareLinkRecord | null>;
  addInboundEmail(input: Omit<EmailInboundRecord, 'id' | 'receivedAt'>): Promise<EmailInboundRecord>;
  addAnalytics(events: Array<Omit<AnalyticsRecord, 'id' | 'createdAt'>>): Promise<number>;
  getAnalytics(limit?: number): Promise<AnalyticsRecord[]>;
}
