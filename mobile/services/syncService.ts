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
const LAST_PUSHED_AT_KEY = 'filetrail-sync-last-pushed-at';
const FAILURE_COUNT_KEY = 'filetrail-sync-failure-count';

// After this many consecutive failed cycles, drop local sync identity so the
// next attempt re-registers the device and pulls a full snapshot rather than
// retrying indefinitely against whatever broke (e.g. a stale syncVersion).
const MAX_CONSECUTIVE_FAILURES = 10;

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

async function getLastPushedAt(): Promise<string> {
  return (await AsyncStorage.getItem(LAST_PUSHED_AT_KEY)) ?? '';
}

async function setLastPushedAt(value: string): Promise<void> {
  await AsyncStorage.setItem(LAST_PUSHED_AT_KEY, value);
}

async function getFailureCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(FAILURE_COUNT_KEY);
  return raw ? Number(raw) || 0 : 0;
}

async function setFailureCount(count: number): Promise<void> {
  await AsyncStorage.setItem(FAILURE_COUNT_KEY, String(count));
}

/**
 * Forgets this device's sync identity, last-synced version, push cursor and
 * failure count, so the next sync re-registers as a new device and pulls a
 * full snapshot from the server. Useful for testing sync from a clean slate,
 * or recovering from a device stuck pushing/pulling against a stale syncVersion.
 */
export async function resetSyncState(): Promise<void> {
  await AsyncStorage.multiRemove([DEVICE_ID_KEY, SYNC_VERSION_KEY, LAST_PUSHED_AT_KEY, FAILURE_COUNT_KEY]);
}

export async function syncMetadata(input: {
  documents: Document[];
  folders: Folder[];
  deletedDocumentIds: string[];
  deletedFolderIds: string[];
  auth?: { userId?: string; storageAccessToken?: string };
  mergeDocuments: (documents: Document[]) => void;
  mergeFolders: (folders: Folder[]) => void;
  applyTombstones: (tombstones: Tombstone[]) => void | Promise<void>;
  markDeletesSynced: (documentIds: string[], folderIds: string[]) => void;
}): Promise<SyncResult | null> {
  if (!isBackendConfigured()) return null;

  try {
    const deviceId = await getDeviceId();
    const sinceVersion = await getLastSyncVersion();

    // Only push items changed since the last successful push — the server
    // upserts by ID, so a partial push is safe and dramatically smaller than
    // re-sending the whole vault every cycle.
    const lastPushedAt = await getLastPushedAt();
    const documentsToPush = lastPushedAt
      ? input.documents.filter((doc) => doc.updatedAt > lastPushedAt)
      : input.documents;
    const foldersToPush = lastPushedAt
      ? input.folders.filter((folder) => folder.updatedAt > lastPushedAt)
      : input.folders;

    const push = await apiRequest<SyncPushResponse>('/v1/sync/push', {
      method: 'POST',
      body: {
        deviceId,
        documents: documentsToPush,
        folders: foldersToPush,
        deletedDocumentIds: input.deletedDocumentIds,
        deletedFolderIds: input.deletedFolderIds,
      },
      headers: input.auth?.userId && input.auth.storageAccessToken
        ? {
            'X-FileTrail-User-Id': input.auth.userId,
            'X-FileTrail-Storage-Token': input.auth.storageAccessToken,
          }
        : undefined,
    });

    // Guard: if the server accepted the request but reports a logical failure, do
    // NOT clear local tombstones — they must be re-sent on the next sync cycle.
    if (!push.ok) {
      throw new Error('[sync] push rejected by server (ok: false)');
    }

    const pull = await apiRequest<SyncPullResponse>('/v1/sync/pull', {
      method: 'POST',
      body: { deviceId, sinceVersion },
      headers: input.auth?.userId && input.auth.storageAccessToken
        ? {
            'X-FileTrail-User-Id': input.auth.userId,
            'X-FileTrail-Storage-Token': input.auth.storageAccessToken,
          }
        : undefined,
    });

    // Apply pulled data. All three steps must complete before we clear tombstones.
    // If applyTombstones throws (e.g. a file-delete fails), markDeletesSynced is
    // not reached and the tombstones are retried on the next sync — intentional.
    if (pull.documents.length > 0) input.mergeDocuments(pull.documents);
    if (pull.folders.length > 0) input.mergeFolders(pull.folders);
    if (pull.tombstones.length > 0) await input.applyTombstones(pull.tombstones);

    // Only reached if push confirmed AND pull+apply all succeeded.
    // Pass the snapshot IDs that were sent, not the current live state, so any
    // deletions that happened mid-sync are preserved for the next cycle.
    input.markDeletesSynced(input.deletedDocumentIds, input.deletedFolderIds);

    const syncVersion = Math.max(push.syncVersion, pull.syncVersion);
    await setLastSyncVersion(syncVersion);

    // Advance the push cursor to the newest `updatedAt` actually sent — not
    // "now" — so an item edited again mid-cycle (with the same or later
    // timestamp) is still picked up by the `> lastPushedAt` filter next time.
    const pushedTimestamps = [...documentsToPush, ...foldersToPush].map((item) => item.updatedAt);
    if (pushedTimestamps.length > 0) {
      const newest = pushedTimestamps.reduce((max, ts) => (ts > max ? ts : max));
      await setLastPushedAt(newest);
    }

    await setFailureCount(0);

    return {
      pushed: documentsToPush.length + foldersToPush.length,
      pushedDeletedDocuments: input.deletedDocumentIds.length,
      pushedDeletedFolders: input.deletedFolderIds.length,
      pulledDocuments: pull.documents.length,
      pulledFolders: pull.folders.length,
      pulledTombstones: pull.tombstones.length,
      syncVersion,
    };
  } catch (err) {
    // Persistent failure: drop local sync identity so the next cycle
    // re-registers and pulls a fresh snapshot instead of retrying forever
    // against whatever broke (e.g. a stale syncVersion or push cursor).
    const failures = (await getFailureCount()) + 1;
    if (failures >= MAX_CONSECUTIVE_FAILURES) {
      await resetSyncState();
    } else {
      await setFailureCount(failures);
    }
    throw err;
  }
}
