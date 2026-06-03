/**
 * documentStore.ts — Zustand store for documents, folders, tags
 *
 * Phase 1: loadDocuments, loadFolders, loadTags, addDocument, editDocument,
 *           removeDocument, addFolder, removeFolder, addTag, removeTag,
 *           setFilters, search
 *
 * Phase 2 additions:
 *   - addDocument() now accepts a full Document and persists immediately
 *   - updateDocument() partial-patch API for post-OCR updates
 *   - removeDocument() now also calls deleteDocumentFiles() for file cleanup
 *   - searchQuery + activeCategory state for filter chips on Vault screen
 */

import { create } from 'zustand';
import {
  listDocuments, insertDocument, updateDocument, deleteDocument,
  listFolders, insertFolder, deleteFolder,
  listTags, insertTag, deleteTag,
  searchDocuments,
} from '@/services/db';
import { deleteDocumentFiles } from '@/services/fileStorage';
import type { Document, DocumentFolder, DocumentTag, SearchFilters } from '@/types/document';

interface DocumentState {
  documents:      Document[];
  folders:        DocumentFolder[];
  tags:           DocumentTag[];
  isLoading:      boolean;
  error:          string | null;
  filters:        SearchFilters;
  searchQuery:    string;
  activeCategory: Document['category'] | null;

  // Document CRUD
  loadDocuments:    (filters?: SearchFilters) => Promise<void>;
  addDocument:      (doc: Document) => Promise<void>;
  updateDocument:   (id: string, patch: Partial<Document>) => Promise<void>;
  editDocument:     (doc: Partial<Document> & { id: string }) => Promise<void>;
  removeDocument:   (id: string) => Promise<void>;

  // Folder CRUD
  loadFolders:      () => Promise<void>;
  addFolder:        (folder: DocumentFolder) => Promise<void>;
  removeFolder:     (id: string) => Promise<void>;

  // Tag CRUD
  loadTags:         () => Promise<void>;
  addTag:           (tag: DocumentTag) => Promise<void>;
  removeTag:        (id: string) => Promise<void>;

  // Filters
  setFilters:       (filters: SearchFilters) => void;
  search:           (query: string) => Promise<void>;
  setSearchQuery:   (q: string) => void;
  setActiveCategory:(cat: Document['category'] | null) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents:      [],
  folders:        [],
  tags:           [],
  isLoading:      false,
  error:          null,
  filters:        {},
  searchQuery:    '',
  activeCategory: null,

  loadDocuments: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const f = filters ?? get().filters;
      let docs: Document[];
      if (f.query && f.query.trim().length > 0) {
        docs = await searchDocuments(f.query.trim());
      } else {
        docs = await listDocuments(f.folderId, f.category, 100, 0);
      }
      const sortBy  = f.sortBy  ?? 'createdAt';
      const sortDir = f.sortDir ?? 'desc';
      docs.sort((a, b) => {
        const aVal = a[sortBy] as number | string;
        const bVal = b[sortBy] as number | string;
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
      if (f.isFavorite) docs = docs.filter(d => d.isFavorite);
      set({ documents: docs, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addDocument: async (doc: Document) => {
    await insertDocument(doc);
    // Optimistic prepend + reload for sort consistency
    set(s => ({ documents: [doc, ...s.documents] }));
  },

  updateDocument: async (id: string, patch: Partial<Document>) => {
    await updateDocument({ id, ...patch } as Partial<Document> & { id: string });
    set(s => ({
      documents: s.documents.map(d =>
        d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d
      ),
    }));
  },

  editDocument: async (doc) => {
    await updateDocument(doc);
    await get().loadDocuments();
  },

  removeDocument: async (id: string) => {
    await deleteDocument(id);
    await deleteDocumentFiles(id).catch(() => {}); // best-effort file cleanup
    set(s => ({ documents: s.documents.filter(d => d.id !== id) }));
  },

  loadFolders: async () => {
    const folders = await listFolders();
    set({ folders });
  },

  addFolder: async (folder) => {
    await insertFolder(folder);
    await get().loadFolders();
  },

  removeFolder: async (id) => {
    await deleteFolder(id);
    set(s => ({ folders: s.folders.filter(f => f.id !== id) }));
  },

  loadTags: async () => {
    const tags = await listTags();
    set({ tags });
  },

  addTag: async (tag) => {
    await insertTag(tag);
    await get().loadTags();
  },

  removeTag: async (id) => {
    await deleteTag(id);
    set(s => ({ tags: s.tags.filter(t => t.id !== id) }));
  },

  setFilters: (filters) => {
    set({ filters });
    get().loadDocuments(filters);
  },

  search: async (query) => {
    get().setFilters({ ...get().filters, query });
  },

  setSearchQuery:    (q)   => set({ searchQuery: q }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
}));
