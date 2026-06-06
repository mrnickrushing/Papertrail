/**
 * documentStore.ts — Local-first Zustand store for documents and folders.
 *
 * The current app is intentionally offline-first: document metadata is persisted
 * with AsyncStorage, while the original files live in the app document directory.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nanoid } from 'nanoid/non-secure';
import type { Document, Folder, SearchFilters, SearchResult } from '@/types/document';
import { deleteDocumentFiles } from '@/services/fileStorage';
import { enqueueOCR, dequeueOCR } from '@/services/ocrQueue';
import { syncMetadata, type Tombstone } from '@/services/syncService';
import { Colors } from '@/theme';

const DOCUMENT_CATEGORIES = new Set<Document['category']>([
  'receipt',
  'contract',
  'id',
  'warranty',
  'medical',
  'tax',
  'other',
]);

const OCR_STATUSES = new Set<Document['ocrStatus']>([
  'pending',
  'processing',
  'done',
  'failed',
  'unavailable',
]);

interface DocumentState {
  documents: Document[];
  folders: Folder[];
  deletedDocumentIds: string[];
  deletedFolderIds: string[];
  isLoading: boolean;
  error: string | null;
  filters: SearchFilters;

  // Compatibility no-ops for screens that refresh from a backing store.
  loadDocuments: () => Promise<void>;
  loadFolders: () => Promise<void>;
  loadTags: () => Promise<void>;

  // Document actions
  addDocument: (doc: Omit<Document, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDocument: (id: string, patch: Partial<Document>) => void;
  deleteDocument: (id: string) => Promise<void>;
  removeDocument: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  moveDocumentToFolder: (documentId: string, folderId: string | null) => void;

  // OCR actions
  retryOCR: (id: string) => void;
  processOCRQueue: () => void;
  syncWithBackend: () => Promise<void>;

  // Bulk document actions
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkMove: (ids: string[], folderId: string | null) => void;
  bulkSetTags: (ids: string[], tags: string[]) => void;
  updateDocumentTags: (id: string, tags: string[]) => void;
  getAllTags: () => string[];

  // Folder actions
  addFolder: (name: string, color?: string) => Folder;
  updateFolder: (id: string, patch: Partial<Pick<Folder, 'name' | 'color'>>) => void;
  deleteFolder: (id: string, moveDocumentsToRoot?: boolean) => Promise<void>;

  // Selectors/filtering
  setFilters: (filters: SearchFilters) => void;
  getVisibleDocuments: () => Document[];
  getDocument: (id: string) => Document | undefined;
  getFolderDocuments: (folderId: string | null) => Document[];
  search: (query: string) => SearchResult[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function dateValue(value: unknown): string {
  const raw = typeof value === 'string' ? value : '';
  return Number.isNaN(Date.parse(raw)) ? nowIso() : raw;
}

function sanitizeDocument(value: unknown): Document | null {
  if (!isRecord(value)) return null;

  const id = stringValue(value.id, '');
  if (!id) return null;

  const category = DOCUMENT_CATEGORIES.has(value.category as Document['category'])
    ? value.category as Document['category']
    : 'other';
  const ocrStatus = OCR_STATUSES.has(value.ocrStatus as Document['ocrStatus'])
    ? value.ocrStatus as Document['ocrStatus']
    : 'unavailable';
  const fileUri = stringValue(value.fileUri, '');

  return {
    id,
    title: stringValue(value.title, 'Untitled document'),
    category,
    fileUri,
    thumbnailUri: typeof value.thumbnailUri === 'string' ? value.thumbnailUri : null,
    mimeType: stringValue(value.mimeType, 'application/octet-stream'),
    fileSizeBytes: numberValue(value.fileSizeBytes, 0),
    pageCount: Math.max(1, numberValue(value.pageCount, 1)),
    ocrText: typeof value.ocrText === 'string' ? value.ocrText : undefined,
    ocrStatus,
    inferredDate: typeof value.inferredDate === 'string' ? value.inferredDate : undefined,
    amounts: Array.isArray(value.amounts)
      ? value.amounts.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
      : undefined,
    vendor: typeof value.vendor === 'string' ? value.vendor : undefined,
    isFavorite: value.isFavorite === true,
    folderId: typeof value.folderId === 'string' ? value.folderId : null,
    tags: stringArrayValue(value.tags),
    createdAt: dateValue(value.createdAt),
    updatedAt: dateValue(value.updatedAt),
  };
}

function sanitizeFolder(value: unknown): Folder | null {
  if (!isRecord(value)) return null;
  const id = stringValue(value.id, '');
  if (!id) return null;
  const createdAt = dateValue(value.createdAt);
  return {
    id,
    name: stringValue(value.name, 'Folder'),
    color: stringValue(value.color, Colors.primary),
    createdAt,
    updatedAt: dateValue(value.updatedAt ?? createdAt),
  };
}

function sanitizePersistedState(value: unknown): Partial<DocumentState> {
  if (!isRecord(value)) return {};
  return {
    documents: Array.isArray(value.documents)
      ? value.documents.map(sanitizeDocument).filter((doc): doc is Document => doc !== null)
      : [],
    folders: Array.isArray(value.folders)
      ? value.folders.map(sanitizeFolder).filter((folder): folder is Folder => folder !== null)
      : [],
    deletedDocumentIds: stringArrayValue(value.deletedDocumentIds),
    deletedFolderIds: stringArrayValue(value.deletedFolderIds),
  };
}

function buildSnippet(text: string, term: string, windowChars = 120): string {
  const lower = text.toLowerCase();
  const termLower = term.toLowerCase();
  const idx = lower.indexOf(termLower);
  if (idx === -1) return text.slice(0, windowChars);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + term.length + 80);
  const raw = text.slice(start, end);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // gi flag to highlight ALL occurrences in the snippet window
  const re = new RegExp(`(${escaped})`, 'gi');
  return `${start > 0 ? '…' : ''}${raw.replace(re, '<mark>$1</mark>')}${end < text.length ? '…' : ''}`;
}

function appendUnique(existing: string[], ids: string[]): string[] {
  const next = new Set(existing);
  for (const id of ids) next.add(id);
  return Array.from(next);
}

function removeSynced(existing: string[], synced: string[]): string[] {
  if (synced.length === 0) return existing;
  const syncedSet = new Set(synced);
  return existing.filter((id) => !syncedSet.has(id));
}

function applyFilters(documents: Document[], filters: SearchFilters): Document[] {
  let docs = [...documents];

  if (filters.category) {
    docs = docs.filter((doc) => doc.category === filters.category);
  }
  if ('folderId' in filters && filters.folderId !== undefined) {
    docs = docs.filter((doc) => doc.folderId === filters.folderId);
  }
  if (filters.isFavorite) {
    docs = docs.filter((doc) => doc.isFavorite);
  }
  if (filters.tags?.length) {
    docs = docs.filter((doc) => filters.tags!.every((tag) => doc.tags.includes(tag)));
  }

  const sortBy = filters.sortBy ?? 'createdAt';
  const sortDir = filters.sortDir ?? 'desc';
  docs.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return docs;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: [],
      folders: [],
      deletedDocumentIds: [],
      deletedFolderIds: [],
      isLoading: false,
      error: null,
      filters: {},

      loadDocuments: async () => undefined,
      loadFolders: async () => undefined,
      loadTags: async () => undefined,

      addDocument: async (doc) => {
        const now = nowIso();
        const full: Document = { ...doc, createdAt: now, updatedAt: now };
        set((s) => ({ documents: [full, ...s.documents] }));
        // Auto-enqueue OCR for image documents only (not PDFs)
        const isImage = /^image\/(jpeg|png|heic|heif|webp|gif|tiff)/.test(doc.mimeType);
        if (isImage && doc.ocrStatus === 'pending') {
          enqueueOCR(doc.id, doc.fileUri);
        }
      },

      updateDocument: (id, patch) => {
        set((s) => ({
          documents: s.documents.map((doc) =>
            doc.id === id ? { ...doc, ...patch, updatedAt: nowIso() } : doc
          ),
        }));
      },

      retryOCR: (id) => {
        const doc = get().documents.find((d) => d.id === id);
        if (!doc) return;
        // Don't re-enqueue if already queued or processing
        if (doc.ocrStatus === 'pending' || doc.ocrStatus === 'processing') return;
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, ocrStatus: 'pending', ocrText: undefined } : d
          ),
        }));
        enqueueOCR(id, doc.fileUri);
      },

      processOCRQueue: () => {
        // Only enqueue docs that are pending (not already processing or done)
        const pending = get().documents.filter((d) => d.ocrStatus === 'pending');
        for (const doc of pending) enqueueOCR(doc.id, doc.fileUri);
      },

      syncWithBackend: async () => {
        await syncMetadata({
          documents: get().documents,
          folders: get().folders,
          deletedDocumentIds: get().deletedDocumentIds,
          deletedFolderIds: get().deletedFolderIds,
          mergeDocuments: (incoming) => {
            set((s) => {
              const localById = new Map(s.documents.map((doc) => [doc.id, doc]));
              for (const doc of incoming) {
                const local = localById.get(doc.id);
                if (!local || doc.updatedAt > local.updatedAt) {
                  localById.set(doc.id, { ...local, ...doc });
                }
              }
              return { documents: Array.from(localById.values()) };
            });
          },
          mergeFolders: (incoming) => {
            set((s) => {
              const localById = new Map(s.folders.map((folder) => [folder.id, folder]));
              for (const folder of incoming) {
                const local = localById.get(folder.id);
                if (!local || folder.updatedAt > local.updatedAt) {
                  localById.set(folder.id, folder);
                }
              }
              return { folders: Array.from(localById.values()) };
            });
          },
          applyTombstones: async (incoming: Tombstone[]) => {
            const deletedDocumentIds = incoming
              .filter((item) => item.kind === 'document')
              .map((item) => item.id);
            const deletedFolderIds = incoming
              .filter((item) => item.kind === 'folder')
              .map((item) => item.id);

            for (const id of deletedDocumentIds) dequeueOCR(id);
            await Promise.all(
              deletedDocumentIds.map((id) => deleteDocumentFiles(id).catch(() => undefined))
            );

            set((s) => {
              return {
                documents: s.documents
                  .filter((doc) => !deletedDocumentIds.includes(doc.id))
                  .map((doc) =>
                    doc.folderId && deletedFolderIds.includes(doc.folderId)
                      ? { ...doc, folderId: null, updatedAt: nowIso() }
                      : doc
                  ),
                folders: s.folders.filter((folder) => !deletedFolderIds.includes(folder.id)),
              };
            });
          },
          markDeletesSynced: (documentIds, folderIds) => {
            set((s) => ({
              deletedDocumentIds: removeSynced(s.deletedDocumentIds, documentIds),
              deletedFolderIds: removeSynced(s.deletedFolderIds, folderIds),
            }));
          },
        });
      },

      deleteDocument: async (id) => {
        dequeueOCR(id);
        const doc = get().documents.find((d) => d.id === id);
        if (doc) {
          // Delete file first; remove from state regardless (stale file is recoverable, orphan metadata is not)
          await deleteDocumentFiles(id).catch((error) => {
            console.warn('[documentStore] File cleanup failed:', error);
          });
        }
        set((s) => ({
          documents: s.documents.filter((d) => d.id !== id),
          deletedDocumentIds: appendUnique(s.deletedDocumentIds, [id]),
        }));
      },

      removeDocument: async (id) => get().deleteDocument(id),

      toggleFavorite: (id) => {
        set((s) => ({
          documents: s.documents.map((doc) =>
            doc.id === id ? { ...doc, isFavorite: !doc.isFavorite, updatedAt: nowIso() } : doc
          ),
        }));
      },

      bulkDelete: async (ids) => {
        const docs = get().documents.filter((d) => ids.includes(d.id));
        ids.forEach(dequeueOCR);
        // Delete files first, then remove from state
        await Promise.all(docs.map((d) => deleteDocumentFiles(d.id).catch(() => undefined)));
        set((s) => ({
          documents: s.documents.filter((d) => !ids.includes(d.id)),
          deletedDocumentIds: appendUnique(s.deletedDocumentIds, ids),
        }));
      },

      bulkMove: (ids, folderId) => {
        set((s) => ({
          documents: s.documents.map((doc) =>
            ids.includes(doc.id) ? { ...doc, folderId, updatedAt: nowIso() } : doc
          ),
        }));
      },

      bulkSetTags: (ids, tags) => {
        set((s) => ({
          documents: (() => {
            const selected = s.documents.filter((doc) => ids.includes(doc.id));
            const sharedTags = selected.length === 0
              ? []
              : selected[0].tags.filter((tag) => selected.every((doc) => doc.tags.includes(tag)));
            const removedSharedTags = sharedTags.filter((tag) => !tags.includes(tag));
            return s.documents.map((doc) => {
              if (!ids.includes(doc.id)) return doc;
              const preserved = doc.tags.filter((tag) => !removedSharedTags.includes(tag));
              return { ...doc, tags: appendUnique(preserved, tags), updatedAt: nowIso() };
            });
          })(),
        }));
      },

      updateDocumentTags: (id, tags) => {
        set((s) => ({
          documents: s.documents.map((doc) =>
            doc.id === id ? { ...doc, tags, updatedAt: nowIso() } : doc
          ),
        }));
      },

      getAllTags: () => {
        const tagSet = new Set<string>();
        for (const doc of get().documents) {
          for (const tag of doc.tags) tagSet.add(tag);
        }
        return Array.from(tagSet).sort();
      },


      moveDocumentToFolder: (documentId, folderId) => {
        set((s) => ({
          documents: s.documents.map((doc) =>
            doc.id === documentId ? { ...doc, folderId, updatedAt: nowIso() } : doc
          ),
        }));
      },

      addFolder: (name, color = Colors.primary) => {
        const now = nowIso();
        const folder: Folder = { id: nanoid(), name, color, createdAt: now, updatedAt: now };
        set((s) => ({ folders: [...s.folders, folder] }));
        return folder;
      },

      updateFolder: (id, patch) => {
        set((s) => ({
          folders: s.folders.map((folder) =>
            folder.id === id ? { ...folder, ...patch, updatedAt: nowIso() } : folder
          ),
        }));
      },

      deleteFolder: async (id, moveDocumentsToRoot = true) => {
        if (moveDocumentsToRoot) {
          set((s) => ({
            folders: s.folders.filter((folder) => folder.id !== id),
            documents: s.documents.map((doc) =>
              doc.folderId === id ? { ...doc, folderId: null, updatedAt: nowIso() } : doc
            ),
            deletedFolderIds: appendUnique(s.deletedFolderIds, [id]),
          }));
          return;
        }

        const toDelete = get().documents.filter((doc) => doc.folderId === id);
        const deletedDocumentIds = toDelete.map((doc) => doc.id);
        set((s) => ({
          folders: s.folders.filter((folder) => folder.id !== id),
          documents: s.documents.filter((doc) => doc.folderId !== id),
          deletedFolderIds: appendUnique(s.deletedFolderIds, [id]),
          deletedDocumentIds: appendUnique(s.deletedDocumentIds, deletedDocumentIds),
        }));
        await Promise.all(toDelete.map((doc) => deleteDocumentFiles(doc.id).catch(() => undefined)));
      },

      setFilters: (filters) => set({ filters }),

      getVisibleDocuments: () => applyFilters(get().documents, get().filters),

      getDocument: (id) => get().documents.find((doc) => doc.id === id),

      getFolderDocuments: (folderId) => get().documents.filter((doc) => doc.folderId === folderId),

      search: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return [];

        const results: SearchResult[] = [];
        for (const doc of get().documents) {
          const matchedFields: SearchResult['matchedFields'] = [];
          let snippet: string | null = null;

          if (doc.title.toLowerCase().includes(q)) matchedFields.push('title');
          if (doc.category.toLowerCase().includes(q)) matchedFields.push('category');
          if (doc.tags.some((tag) => tag.toLowerCase().includes(q))) matchedFields.push('tags');
          if (doc.ocrText?.toLowerCase().includes(q)) {
            matchedFields.push('ocrText');
            snippet = buildSnippet(doc.ocrText, q);
          }

          if (matchedFields.length > 0) {
            results.push({ document: doc, snippet, matchedFields });
          }
        }

        return results.sort((a, b) => {
          const aTitle = a.matchedFields.includes('title') ? 0 : 1;
          const bTitle = b.matchedFields.includes('title') ? 0 : 1;
          if (aTitle !== bTitle) return aTitle - bTitle;
          return b.document.updatedAt.localeCompare(a.document.updatedAt);
        });
      },
    }),
    {
      name: 'filetrail-documents-v2',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedState(persistedState),
      }),
      partialize: (state) => ({
        documents: state.documents,
        folders: state.folders,
        deletedDocumentIds: state.deletedDocumentIds,
        deletedFolderIds: state.deletedFolderIds,
      }),
    }
  )
);
