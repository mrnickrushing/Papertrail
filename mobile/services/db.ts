/**
 * Legacy database facade.
 *
 * The current mobile app uses the local-first Zustand store as the canonical
 * metadata source. These no-op exports remain so older imports keep compiling
 * while the SQLite schema is reintroduced behind a deliberate migration later.
 */

import type { Document, Folder } from '@/types/document';

export async function initDb(): Promise<void> {}
export async function listDocuments(): Promise<Document[]> { return []; }
export async function insertDocument(_doc: Document): Promise<void> {}
export async function updateDocument(_doc: Partial<Document> & { id: string }): Promise<void> {}
export async function deleteDocument(_id: string): Promise<void> {}
export async function getDocument(_id: string): Promise<Document | null> { return null; }
export async function searchDocuments(_query: string): Promise<Document[]> { return []; }
export async function listFolders(): Promise<Folder[]> { return []; }
export async function insertFolder(_folder: Folder): Promise<void> {}
export async function deleteFolder(_id: string): Promise<void> {}
