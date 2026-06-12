/**
 * document.ts — Core domain types for FileTrail
 *
 * Phase 3 additions:
 *   - Folder type
 *   - folderId on Document (was already present, now enforced)
 *   - SearchResult type
 */

export type DocumentCategory =
  | 'receipt'
  | 'bill'
  | 'contract'
  | 'id'
  | 'warranty'
  | 'medical'
  | 'tax'
  | 'work'
  | 'retirement'
  | 'insurance'
  | 'legal'
  | 'vehicle'
  | 'property'
  | 'education'
  | 'travel'
  | 'pet'
  | 'other';

export type OCRStatus = 'pending' | 'processing' | 'done' | 'failed' | 'unavailable';
export type DocumentSource = 'camera' | 'photo' | 'file' | 'email';

export interface DocumentFacts {
  personName?: string;
  documentType?: string;
  issuer?: string;
  issueDate?: string;
  expirationDate?: string;
  dueDate?: string;
  policyNumber?: string;
  accountNumber?: string;
  memberNumber?: string;
  amountDue?: number;
  confidence?: 'low' | 'medium' | 'high';
}

export interface EmailSource {
  sender: string;
  subject?: string;
  receivedAt?: string;
}

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
  inferredDate?: string;
  amounts?: number[];
  vendor?: string;
  source?: DocumentSource;
  sourceLabel?: string;
  emailSource?: EmailSource;
  facts?: DocumentFacts;

  // Organisation
  isFavorite: boolean;
  folderId: string | null;
  tags: string[];
  notes?: string;
  aiSource?: 'heuristic' | 'claude';
  aiOrganizedAt?: string;

  // Cloud storage (Pro only)
  storageUrl?: string;

  // Timestamps (ISO strings)
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string; // hex color for folder icon accent
  parentId?: string | null;
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
