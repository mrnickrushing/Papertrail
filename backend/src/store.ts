import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  AnalyticsRecord,
  AppData,
  DocumentRecord,
  EmailInboundRecord,
  FolderRecord,
  ShareLinkRecord,
  TombstoneRecord,
} from './types.js';
import type { PapertrailStore, SyncPullOutput, SyncPushInput } from './storeInterface.js';

const INITIAL_DATA: AppData = {
  syncVersion: 0,
  documents: {},
  folders: {},
  tombstones: [],
  shareLinks: {},
  inboundEmails: {},
  analytics: [],
};

export class JsonStore implements PapertrailStore {
  private readonly filePath: string;
  private writeChain = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'papertrail.json');
  }

  async init(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await readFile(this.filePath, 'utf8');
    } catch {
      await this.write({ ...INITIAL_DATA });
    }
  }

  async read(): Promise<AppData> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      return { ...INITIAL_DATA, ...JSON.parse(raw) } as AppData;
    } catch {
      return { ...INITIAL_DATA };
    }
  }

  async write(data: AppData): Promise<void> {
    this.writeChain = this.writeChain.then(() =>
      writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8')
    );
    await this.writeChain;
  }

  async push(input: SyncPushInput): Promise<{ syncVersion: number }> {
    const data = await this.read();
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
    await this.write(data);
    return { syncVersion: data.syncVersion };
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

  async createShareLink(input: Omit<ShareLinkRecord, 'token' | 'createdAt'>): Promise<ShareLinkRecord> {
    const data = await this.read();
    const record: ShareLinkRecord = {
      ...input,
      token: randomUUID().replace(/-/g, ''),
      createdAt: new Date().toISOString(),
    };
    data.shareLinks[record.token] = record;
    await this.write(data);
    return record;
  }

  async getShareLink(token: string): Promise<ShareLinkRecord | null> {
    const data = await this.read();
    return data.shareLinks[token] ?? null;
  }

  async addInboundEmail(input: Omit<EmailInboundRecord, 'id' | 'receivedAt'>): Promise<EmailInboundRecord> {
    const data = await this.read();
    const record: EmailInboundRecord = {
      ...input,
      id: randomUUID(),
      receivedAt: new Date().toISOString(),
    };
    data.inboundEmails[record.id] = record;
    await this.write(data);
    return record;
  }

  async getAnalytics(limit = 500): Promise<AnalyticsRecord[]> {
    const data = await this.read();
    return data.analytics.slice(-limit).reverse();
  }

  async addAnalytics(events: Array<Omit<AnalyticsRecord, 'id' | 'createdAt'>>): Promise<number> {
    const data = await this.read();
    const records = events.map((event) => ({
      ...event,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }));
    data.analytics.push(...records);
    data.analytics = data.analytics.slice(-5000);
    await this.write(data);
    return records.length;
  }
}
