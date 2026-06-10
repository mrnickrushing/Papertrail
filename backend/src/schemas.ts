import { z } from 'zod';

export const documentCategorySchema = z.enum([
  'receipt',
  'bill',
  'contract',
  'id',
  'warranty',
  'medical',
  'tax',
  'work',
  'retirement',
  'insurance',
  'legal',
  'vehicle',
  'property',
  'education',
  'travel',
  'pet',
  'other',
]);

export const ocrStatusSchema = z.enum(['pending', 'processing', 'done', 'failed', 'unavailable']);

export const documentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: documentCategorySchema,
  fileUri: z.string().optional(),
  thumbnailUri: z.string().nullable().optional(),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().nonnegative(),
  pageCount: z.number().int().positive(),
  ocrText: z.string().optional(),
  ocrStatus: ocrStatusSchema,
  inferredDate: z.string().optional(),
  amounts: z.array(z.number()).optional(),
  vendor: z.string().optional(),
  isFavorite: z.boolean(),
  folderId: z.string().nullable(),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  aiSource: z.enum(['heuristic', 'claude']).optional(),
  aiOrganizedAt: z.string().optional(),
  // R2 object reference (r2://bucket/key) — must round-trip through sync so
  // other devices can restore the file from cloud storage.
  storageUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  syncVersion: z.number().int().nonnegative().optional(),
});

export const folderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  parentId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  syncVersion: z.number().int().nonnegative().optional(),
});

export const syncPullSchema = z.object({
  deviceId: z.string().min(1),
  sinceVersion: z.number().int().nonnegative().optional().default(0),
});

export const syncPushSchema = z.object({
  deviceId: z.string().min(1),
  documents: z.array(documentSchema).optional().default([]),
  folders: z.array(folderSchema).optional().default([]),
  deletedDocumentIds: z.array(z.string()).optional().default([]),
  deletedFolderIds: z.array(z.string()).optional().default([]),
});

export const aiSuggestSchema = z.object({
  title: z.string().optional(),
  filename: z.string().optional(),
  ocrText: z.string().optional(),
  mimeType: z.string().optional(),
  pdfBase64: z.string().optional(),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  existingFolders: z.array(z.string()).optional(),
});

export const shareLinkCreateSchema = z.object({
  documentId: z.string().min(1),
  title: z.string().min(1),
  expiresAt: z.string().datetime(),
  password: z.string().min(8).optional(),
});

export const emailInboundSchema = z.object({
  sender: z.string().email(),
  subject: z.string().default(''),
  attachments: z.array(z.object({
    filename: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().nonnegative(),
  })).default([]),
});

export const analyticsEventSchema = z.object({
  event: z.string().min(1),
  deviceId: z.string().optional(),
  userId: z.string().optional(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const analyticsBatchSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(100),
});

export const userRegisterSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  passwordHash: z.string().min(1),
  provider: z.enum(['email', 'apple']).default('email'),
  appleUserId: z.string().optional(),
});

export const userLoginSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(1),
});
