/**
 * PaperTrail — Zustand Document Store
 * Manages all local document state.
 */
import { create } from 'zustand';
import { Document, Folder, Tag, Comment } from '@/types/document';
import { getDb } from '@/services/database';
import { v4 as uuidv4 } from 'uuid';

interface DocumentState {
  documents: Document[];
  folders: Folder[];
  tags: Tag[];
  selectedFolderId: string | null;
  isLoading: boolean;

  // Actions
  loadAll: () => Promise<void>;
  addDocument: (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Document>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;

  addFolder: (folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Folder>;
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  setSelectedFolder: (id: string | null) => void;

  addTag: (name: string, color: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  tagDocument: (documentId: string, tagId: string) => Promise<void>;
  untagDocument: (documentId: string, tagId: string) => Promise<void>;

  getDocumentsByFolder: (folderId: string | null) => Document[];
  getFavoritedDocuments: () => Document[];
  getRecentDocuments: (limit?: number) => Document[];
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  folders: [],
  tags: [],
  selectedFolderId: null,
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    const db = getDb();
    try {
      const documents = db.getAllSync('SELECT * FROM documents ORDER BY updated_at DESC') as any[];
      const folders = db.getAllSync('SELECT * FROM folders ORDER BY name ASC') as any[];
      const tags = db.getAllSync('SELECT * FROM tags ORDER BY name ASC') as any[];

      // Map snake_case DB fields to camelCase
      const mappedDocs: Document[] = documents.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        uri: d.uri,
        thumbnailUri: d.thumbnail_uri,
        ocrText: d.ocr_text,
        folderId: d.folder_id,
        tags: [],
        notes: d.notes,
        expiryDate: d.expiry_date,
        reminderDate: d.reminder_date,
        isFavorited: Boolean(d.is_favorited),
        isEncrypted: Boolean(d.is_encrypted),
        fileSize: d.file_size,
        mimeType: d.mime_type,
        pageCount: d.page_count,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));

      const mappedFolders: Folder[] = folders.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
        color: f.color,
        icon: f.icon,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      }));

      const mappedTags: Tag[] = tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        createdAt: t.created_at,
      }));

      set({ documents: mappedDocs, folders: mappedFolders, tags: mappedTags });
    } finally {
      set({ isLoading: false });
    }
  },

  addDocument: async (doc) => {
    const db = getDb();
    const now = new Date().toISOString();
    const id = uuidv4();

    db.runSync(
      `INSERT INTO documents
        (id, title, type, uri, thumbnail_uri, ocr_text, folder_id, notes,
         expiry_date, reminder_date, is_favorited, is_encrypted,
         file_size, mime_type, page_count, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, doc.title, doc.type, doc.uri,
        doc.thumbnailUri ?? null, doc.ocrText ?? null,
        doc.folderId ?? null, doc.notes ?? null,
        doc.expiryDate ?? null, doc.reminderDate ?? null,
        doc.isFavorited ? 1 : 0, doc.isEncrypted ? 1 : 0,
        doc.fileSize, doc.mimeType, doc.pageCount ?? null,
        now, now,
      ]
    );

    const newDoc: Document = { ...doc, id, tags: [], createdAt: now, updatedAt: now };
    set((s) => ({ documents: [newDoc, ...s.documents] }));
    return newDoc;
  },

  updateDocument: async (id, updates) => {
    const db = getDb();
    const now = new Date().toISOString();
    const fields = Object.entries(updates)
      .map(([k]) => `${toSnake(k)} = ?`)
      .join(', ');
    const values = [...Object.values(updates), now, id];
    db.runSync(`UPDATE documents SET ${fields}, updated_at = ? WHERE id = ?`, values);
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === id ? { ...d, ...updates, updatedAt: now } : d
      ),
    }));
  },

  deleteDocument: async (id) => {
    const db = getDb();
    db.runSync('DELETE FROM documents WHERE id = ?', [id]);
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
  },

  toggleFavorite: async (id) => {
    const db = getDb();
    const doc = get().documents.find((d) => d.id === id);
    if (!doc) return;
    const next = !doc.isFavorited;
    db.runSync('UPDATE documents SET is_favorited = ?, updated_at = ? WHERE id = ?', [
      next ? 1 : 0,
      new Date().toISOString(),
      id,
    ]);
    set((s) => ({
      documents: s.documents.map((d) =>
        d.id === id ? { ...d, isFavorited: next } : d
      ),
    }));
  },

  addFolder: async (folder) => {
    const db = getDb();
    const now = new Date().toISOString();
    const id = uuidv4();
    db.runSync(
      'INSERT INTO folders (id, name, parent_id, color, icon, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
      [id, folder.name, folder.parentId ?? null, folder.color, folder.icon, now, now]
    );
    const newFolder: Folder = { ...folder, id, createdAt: now, updatedAt: now };
    set((s) => ({ folders: [...s.folders, newFolder] }));
    return newFolder;
  },

  updateFolder: async (id, updates) => {
    const db = getDb();
    const now = new Date().toISOString();
    db.runSync(
      'UPDATE folders SET name = ?, color = ?, icon = ?, updated_at = ? WHERE id = ?',
      [updates.name, updates.color, updates.icon, now, id]
    );
    set((s) => ({
      folders: s.folders.map((f) =>
        f.id === id ? { ...f, ...updates, updatedAt: now } : f
      ),
    }));
  },

  deleteFolder: async (id) => {
    const db = getDb();
    db.runSync('DELETE FROM folders WHERE id = ?', [id]);
    set((s) => ({ folders: s.folders.filter((f) => f.id !== id) }));
  },

  setSelectedFolder: (id) => set({ selectedFolderId: id }),

  addTag: async (name, color) => {
    const db = getDb();
    const now = new Date().toISOString();
    const id = uuidv4();
    db.runSync('INSERT INTO tags (id, name, color, created_at) VALUES (?,?,?,?)', [id, name, color, now]);
    const tag: Tag = { id, name, color, createdAt: now };
    set((s) => ({ tags: [...s.tags, tag] }));
    return tag;
  },

  deleteTag: async (id) => {
    const db = getDb();
    db.runSync('DELETE FROM tags WHERE id = ?', [id]);
    set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }));
  },

  tagDocument: async (documentId, tagId) => {
    const db = getDb();
    db.runSync(
      'INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?,?)',
      [documentId, tagId]
    );
  },

  untagDocument: async (documentId, tagId) => {
    const db = getDb();
    db.runSync(
      'DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?',
      [documentId, tagId]
    );
  },

  getDocumentsByFolder: (folderId) => {
    const { documents } = get();
    if (folderId === null) return documents;
    return documents.filter((d) => d.folderId === folderId);
  },

  getFavoritedDocuments: () => get().documents.filter((d) => d.isFavorited),

  getRecentDocuments: (limit = 10) =>
    [...get().documents]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit),
}));

function toSnake(camel: string): string {
  return camel.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
