import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, isBackendConfigured } from '@/services/api';
import type { Document, Folder } from '@/types/document';

export type SyncResult = {
  pushed: number;
  pushedDeletedDocuments: number;
  pushedDeletedFolders: number;
  pulledDocuments: number;
  pulledFolders: number;
  pulledTombstones: number;
  syncVersion: number;
};

type SyncPullResponse = {
  syncVersion: number;
  documents: Document[];
  folders: Folder[];
  tombstones: Tombstone[];
};

type SyncPushResponse = {
  ok: boolean;
  syncVersion: number;
};

const DEVICE_ID_KEY = 'filetrail-device-id';
const SYNC_VERSION_KEY = 'filetrail-sync-version';

export type Tombstone = {
  id: string;
  kind: 'document' | 'folder';
  deletedAt?: string;
  syncVersion: number;
};

async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

async function getLastSyncVersion(): Promise<number> {
  const raw = await AsyncStorage.getItem(SYNC_VERSION_KEY);
  return raw ? Number(raw) || 0 : 0;
}

async function setLastSyncVersion(version: number): Promise<void> {
  await AsyncStorage.setItem(SYNC_VERSION_KEY, String(version));
}

export async function syncMetadata(input: {
  documents: Document[];
  folders: Folder[];
  deletedDocumentIds: string[];
  deletedFolderIds: string[];
  mergeDocuments: (documents: Document[]) => void;
  mergeFolders: (folders: Folder[]) => void;
  applyTombstones: (tombstones: Tombstone[]) => void | Promise<void>;
  markDeletesSynced: (documentIds: string[], folderIds: string[]) => void;
}): Promise<SyncResult | null> {
  if (!isBackendConfigured()) return null;

  const deviceId = await getDeviceId();
  const sinceVersion = await getLastSyncVersion();

  const push = await apiRequest<SyncPushResponse>('/v1/sync/push', {
    method: 'POST',
    body: {
      deviceId,
      documents: input.documents,
      folders: input.folders,
      deletedDocumentIds: input.deletedDocumentIds,
      deletedFolderIds: input.deletedFolderIds,
    },
  });

  const pull = await apiRequest<SyncPullResponse>('/v1/sync/pull', {
    method: 'POST',
    body: { deviceId, sinceVersion },
  });

  if (pull.documents.length > 0) input.mergeDocuments(pull.documents);
  if (pull.folders.length > 0) input.mergeFolders(pull.folders);
  if (pull.tombstones.length > 0) await input.applyTombstones(pull.tombstones);
  input.markDeletesSynced(input.deletedDocumentIds, input.deletedFolderIds);

  const syncVersion = Math.max(push.syncVersion, pull.syncVersion);
  await setLastSyncVersion(syncVersion);

  return {
    pushed: input.documents.length + input.folders.length,
    pushedDeletedDocuments: input.deletedDocumentIds.length,
    pushedDeletedFolders: input.deletedFolderIds.length,
    pulledDocuments: pull.documents.length,
    pulledFolders: pull.folders.length,
    pulledTombstones: pull.tombstones.length,
    syncVersion,
  };
}
