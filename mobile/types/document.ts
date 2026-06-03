/**
 * document.ts — Core domain types for PaperTrail
 *
 * Phase 3 additions:
 *   - Folder type
 *   - folderId on Document (was already present, now enforced)
 *   - SearchResult type
 */

export type DocumentCategory =
  | 'receipt'
  | 'contract'
  | 'id'
  | 'warranty'
  | 'medical'
  | 'tax'
  | 'other';

export type OCRStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface Document {
  id: string;
  title: string;
  category: DocumentCategory;

  // File references
  fileUri: string;
  thumbnailUri: string | null;
  mimeType: string;
  fileSizeBytes: number;
  pageCount: number;

  // OCR
  ocrText?: string;
  ocrStatus: OCRStatus;

  // Organisation
  isFavorite: boolean;
  folderId: string | null;
  tags: string[];

  // Timestamps (ISO strings)
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string; // hex color for folder icon accent
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  document: Document;
  /** Snippet of OCR text around the matched term, with <mark> tags */
  snippet: string | null;
  /** Which fields matched */
  matchedFields: Array<'title' | 'ocrText' | 'category' | 'tags'>;
}


export type SortField = 'title' | 'createdAt' | 'updatedAt' | 'fileSizeBytes' | 'category';
export type SortDirection = 'asc' | 'desc';

export interface SearchFilters {
  query?: string;
  category?: DocumentCategory;
  folderId?: string | null;
  tags?: string[];
  isFavorite?: boolean;
  sortBy?: SortField;
  sortDir?: SortDirection;
}
