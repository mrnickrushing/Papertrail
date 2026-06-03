import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, isBackendConfigured } from '@/services/api';
import type { Document, Folder } from '@/types/document';

export type SyncResult = {
  pushed: number;
  pulledDocuments: number;
  pulledFolders: number;
  syncVersion: number;
};

type SyncPullResponse = {
  syncVersion: number;
  documents: Document[];
  folders: Folder[];
  tombstones: Array<{ id: string; kind: 'document' | 'folder'; syncVersion: number }>;
};

type SyncPushResponse = {
  ok: boolean;
  syncVersion: number;
};

const DEVICE_ID_KEY = 'papertrail-device-id';
const SYNC_VERSION_KEY = 'papertrail-sync-version';

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
  mergeDocuments: (documents: Document[]) => void;
  mergeFolders: (folders: Folder[]) => void;
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
    },
  });

  const pull = await apiRequest<SyncPullResponse>('/v1/sync/pull', {
    method: 'POST',
    body: { deviceId, sinceVersion },
  });

  if (pull.documents.length > 0) input.mergeDocuments(pull.documents);
  if (pull.folders.length > 0) input.mergeFolders(pull.folders);

  const syncVersion = Math.max(push.syncVersion, pull.syncVersion);
  await setLastSyncVersion(syncVersion);

  return {
    pushed: input.documents.length + input.folders.length,
    pulledDocuments: pull.documents.length,
    pulledFolders: pull.folders.length,
    syncVersion,
  };
}
