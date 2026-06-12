import type {
  AnalyticsRecord,
  DocumentRecord,
  EmailInboundRecord,
  ShareLinkCreateInput,
  FolderRecord,
  ShareLinkRecord,
  ShareLinkStoreRecord,
  TombstoneRecord,
  UserRecord,
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

export interface FiletrailStore {
  init(): Promise<void>;
  push(input: SyncPushInput): Promise<{ syncVersion: number }>;
  pull(sinceVersion: number): Promise<SyncPullOutput>;
  createShareLink(input: ShareLinkCreateInput): Promise<ShareLinkRecord>;
  getShareLink(token: string): Promise<ShareLinkStoreRecord | null>;
  listShareLinks(limit?: number): Promise<ShareLinkRecord[]>;
  addInboundEmail(input: Omit<EmailInboundRecord, 'id' | 'receivedAt'>): Promise<EmailInboundRecord>;
  listInboundEmails(limit?: number): Promise<EmailInboundRecord[]>;
  addAnalytics(events: Array<Omit<AnalyticsRecord, 'id' | 'createdAt'>>): Promise<number>;
  getAnalytics(limit?: number): Promise<AnalyticsRecord[]>;
  registerUser(input: Omit<UserRecord, 'isPro' | 'createdAt'>): Promise<UserRecord>;
  getUserByEmail(email: string): Promise<UserRecord | null>;
  getUserById(id: string): Promise<UserRecord | null>;
  listUsers(limit?: number): Promise<UserRecord[]>;
  updateUser(id: string, patch: { isPro?: boolean; fullName?: string; email?: string; storageAccessToken?: string; passwordHash?: string }): Promise<UserRecord | null>;
  deleteUser(id: string): Promise<void>;
  deleteShareLink(token: string): Promise<void>;
  adminStats(): Promise<{
    userCount: number;
    documentCount: number;
    totalStorageBytes: number;
    eventCount: number;
    recentActiveUsers: number;
  }>;
}
