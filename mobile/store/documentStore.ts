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

interface DocumentState {
  documents: Document[];
  folders: Folder[];
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

function buildSnippet(text: string, term: string, windowChars = 120): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx === -1) return text.slice(0, windowChars);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + term.length + 80);
  const raw = text.slice(start, end);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
  return `${start > 0 ? '…' : ''}${raw.replace(re, '<mark>$1</mark>')}${end < text.length ? '…' : ''}`;
}

function applyFilters(documents: Document[], filters: SearchFilters): Document[] {
  let docs = [...documents];

  if (filters.category) {
    docs = docs.filter((doc) => doc.category === filters.category);
  }
  if (filters.folderId !== undefined) {
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
        // Auto-enqueue OCR for image documents
        if (!doc.mimeType.includes('pdf') && doc.ocrStatus === 'pending') {
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
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, ocrStatus: 'pending', ocrText: undefined } : d
          ),
        }));
        enqueueOCR(id, doc.fileUri);
      },

      processOCRQueue: () => {
        const pending = get().documents.filter((d) => d.ocrStatus === 'pending');
        for (const doc of pending) enqueueOCR(doc.id, doc.fileUri);
      },

      deleteDocument: async (id) => {
        dequeueOCR(id);
        const doc = get().documents.find((d) => d.id === id);
        set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
        if (doc) {
          await deleteDocumentFiles(id).catch((error) => {
            console.warn('[documentStore] File cleanup failed:', error);
          });
        }
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
        set((s) => ({ documents: s.documents.filter((d) => !ids.includes(d.id)) }));
        await Promise.all(docs.map((d) => deleteDocumentFiles(d.id).catch(() => undefined)));
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
          documents: s.documents.map((doc) =>
            ids.includes(doc.id) ? { ...doc, tags, updatedAt: nowIso() } : doc
          ),
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

      addFolder: (name, color = '#F59E0B') => {
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
          }));
          return;
        }

        const toDelete = get().documents.filter((doc) => doc.folderId === id);
        set((s) => ({
          folders: s.folders.filter((folder) => folder.id !== id),
          documents: s.documents.filter((doc) => doc.folderId !== id),
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
      name: 'papertrail-documents-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ documents: state.documents, folders: state.folders }),
    }
  )
);
