import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  AnalyticsRecord,
  AppData,
  EmailInboundRecord,
  ShareLinkCreateInput,
  ShareLinkRecord,
  ShareLinkStoreRecord,
  TombstoneRecord,
  UserRecord,
} from './types.js';
import type { FiletrailStore, SyncPullOutput, SyncPushInput } from './storeInterface.js';
import { toPublicShareLinkRecord } from './shareLinks.js';

function newStorageAccessToken(): string {
  return randomUUID().replace(/-/g, '');
}

const INITIAL_DATA: AppData = {
  syncVersion: 0,
  documents: {},
  folders: {},
  tombstones: [],
  shareLinks: {},
  inboundEmails: {},
  analytics: [],
  users: {},
};

export class JsonStore implements FiletrailStore {
  private readonly filePath: string;
  private writeChain = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'filetrail.json');
  }

  async init(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await readFile(this.filePath, 'utf8');
    } catch {
      await this.write({ ...INITIAL_DATA });
    }
  }

  private async readFromDisk(): Promise<AppData> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      return { ...INITIAL_DATA, ...JSON.parse(raw) } as AppData;
    } catch {
      return { ...INITIAL_DATA };
    }
  }

  async read(): Promise<AppData> {
    await this.writeChain;
    return this.readFromDisk();
  }

  async write(data: AppData): Promise<void> {
    this.writeChain = this.writeChain.then(() =>
      writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8')
    );
    await this.writeChain;
  }

  private async mutate<T>(updater: (data: AppData) => T | Promise<T>): Promise<T> {
    const task = this.writeChain.then(async () => {
      const data = await this.readFromDisk();
      const result = await updater(data);
      await writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
      return result;
    });

    this.writeChain = task.then(
      () => undefined,
      () => undefined,
    );

    return task;
  }

  async push(input: SyncPushInput): Promise<{ syncVersion: number }> {
    return this.mutate((data) => {
      const tombstones: TombstoneRecord[] = [];

      const nextVersion = (): number => {
        data.syncVersion += 1;
        return data.syncVersion;
      };

      for (const folder of input.folders) {
        data.folders[folder.id] = { ...folder, syncVersion: nextVersion() };
      }

      for (const document of input.documents) {
        data.documents[document.id] = { ...document, syncVersion: nextVersion() };
      }

      for (const id of input.deletedDocumentIds) {
        delete data.documents[id];
        tombstones.push({ id, kind: 'document', deletedAt: new Date().toISOString(), syncVersion: nextVersion() });
      }

      for (const id of input.deletedFolderIds) {
        delete data.folders[id];
        tombstones.push({ id, kind: 'folder', deletedAt: new Date().toISOString(), syncVersion: nextVersion() });
      }

      data.tombstones.push(...tombstones);
      return { syncVersion: data.syncVersion };
    });
  }

  async pull(sinceVersion: number): Promise<SyncPullOutput> {
    const data = await this.read();
    return {
      syncVersion: data.syncVersion,
      documents: Object.values(data.documents).filter((item) => (item.syncVersion ?? 0) > sinceVersion),
      folders: Object.values(data.folders).filter((item) => (item.syncVersion ?? 0) > sinceVersion),
      tombstones: data.tombstones.filter((item) => item.syncVersion > sinceVersion),
    };
  }

  async createShareLink(input: ShareLinkCreateInput): Promise<ShareLinkRecord> {
    return this.mutate((data) => {
      const record: ShareLinkStoreRecord = {
        documentId: input.documentId,
        title: input.title,
        expiresAt: input.expiresAt,
        passwordProtected: Boolean(input.passwordHash),
        passwordHash: input.passwordHash,
        token: randomUUID().replace(/-/g, ''),
        createdAt: new Date().toISOString(),
      };
      data.shareLinks[record.token] = record;
      return toPublicShareLinkRecord(record);
    });
  }

  async getShareLink(token: string): Promise<ShareLinkStoreRecord | null> {
    const data = await this.read();
    return data.shareLinks[token] ?? null;
  }

  async listShareLinks(limit = 200): Promise<ShareLinkRecord[]> {
    const data = await this.read();
    return Object.values(data.shareLinks)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(toPublicShareLinkRecord);
  }

  async addInboundEmail(input: Omit<EmailInboundRecord, 'id' | 'receivedAt'>): Promise<EmailInboundRecord> {
    return this.mutate((data) => {
      const record: EmailInboundRecord = {
        ...input,
        id: randomUUID(),
        receivedAt: new Date().toISOString(),
      };
      data.inboundEmails[record.id] = record;
      return record;
    });
  }

  async listInboundEmails(limit = 100): Promise<EmailInboundRecord[]> {
    const data = await this.read();
    return Object.values(data.inboundEmails)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
      .slice(0, limit);
  }

  async getAnalytics(limit = 500): Promise<AnalyticsRecord[]> {
    const data = await this.read();
    return data.analytics.slice(-limit).reverse();
  }

  async registerUser(input: Omit<UserRecord, 'isPro' | 'createdAt'>): Promise<UserRecord> {
    return this.mutate((data) => {
      if (!data.users) data.users = {};
      const existing = Object.values(data.users).find(u => u.email === input.email);
      if (existing) {
        if (!existing.storageAccessToken) {
          existing.storageAccessToken = newStorageAccessToken();
        }
        return existing;
      }
      const record: UserRecord = {
        ...input,
        storageAccessToken: input.storageAccessToken || newStorageAccessToken(),
        isPro: false,
        createdAt: new Date().toISOString(),
      };
      data.users[record.id] = record;
      return record;
    });
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const data = await this.read();
    if (!data.users) return null;
    return Object.values(data.users).find(u => u.email === email) ?? null;
  }

  async getUserById(id: string): Promise<UserRecord | null> {
    const data = await this.read();
    if (!data.users) return null;
    return data.users[id] ?? null;
  }

  async listUsers(limit = 500): Promise<UserRecord[]> {
    const data = await this.read();
    if (!data.users) return [];
    return Object.values(data.users)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async updateUser(id: string, patch: { isPro?: boolean; fullName?: string; email?: string; storageAccessToken?: string }): Promise<UserRecord | null> {
    return this.mutate((data) => {
      if (!data.users?.[id]) return null;
      data.users[id] = { ...data.users[id], ...patch };
      return data.users[id];
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.mutate((data) => {
      if (data.users) delete data.users[id];
    });
  }

  async deleteShareLink(token: string): Promise<void> {
    await this.mutate((data) => { delete data.shareLinks[token]; });
  }

  async adminStats(): Promise<{ userCount: number; documentCount: number; totalStorageBytes: number; eventCount: number; recentActiveUsers: number }> {
    const data = await this.read();
    const docs = Object.values(data.documents);
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return {
      userCount: Object.keys(data.users ?? {}).length,
      documentCount: docs.length,
      totalStorageBytes: docs.reduce((s, d) => s + ((d as unknown as { fileSizeBytes?: number }).fileSizeBytes ?? 0), 0),
      eventCount: data.analytics.length,
      recentActiveUsers: new Set(
        data.analytics.filter(e => e.userId && e.createdAt > cutoff).map(e => e.userId!)
      ).size,
    };
  }

  async addAnalytics(events: Array<Omit<AnalyticsRecord, 'id' | 'createdAt'>>): Promise<number> {
    return this.mutate((data) => {
      const records = events.map((event) => ({
        ...event,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
      }));
      data.analytics.push(...records);
      data.analytics = data.analytics.slice(-5000);
      return records.length;
    });
  }
}
