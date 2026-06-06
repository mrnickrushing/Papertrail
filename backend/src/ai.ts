import Anthropic from '@anthropic-ai/sdk';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse') as (buffer: Buffer, options?: { max?: number }) => Promise<{ text: string }>;
import type { DocumentCategory } from './types.js';

const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-haiku-20241022';

const VALID_CATEGORIES: DocumentCategory[] = [
  'receipt', 'contract', 'id', 'warranty', 'medical', 'tax', 'other',
];

const CATEGORY_KEYWORDS: Array<[DocumentCategory, RegExp]> = [
  ['receipt', /\b(receipt|subtotal|total|paid|visa|mastercard|store)\b/i],
  ['contract', /\b(contract|agreement|signature|party|terms)\b/i],
  ['id', /\b(driver|license|passport|identification|dob)\b/i],
  ['warranty', /\b(warranty|serial|coverage|expires)\b/i],
  ['medical', /\b(patient|medical|clinic|hospital|diagnosis|rx)\b/i],
  ['tax', /\b(tax|irs|w-?2|1099|deduction|return)\b/i],
];

const CATEGORY_FOLDER: Record<DocumentCategory, string> = {
  receipt: 'Receipts',
  contract: 'Contracts',
  id: 'IDs',
  warranty: 'Warranties',
  medical: 'Medical Records',
  tax: 'Tax Documents',
  other: 'Other Documents',
};

const SUPPORTED_IMAGE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
]);

type SuggestResult = {
  suggestedTitle: string;
  suggestedFolderName: string;
  category: DocumentCategory;
  tags: string[];
  notes?: string;
  source: 'heuristic' | 'claude';
};

/** Detect auto-generated fallback titles like "PDF Document — Jun 2026". */
function isFallbackTitle(s: string): boolean {
  return /^(?:PDF|Scanned|Receipt|Contract|Id|Warranty|Medical|Tax|Other) Document — [A-Z][a-z]+ \d{4}$/.test(s.trim());
}

/** Detect UUID v4 / hex-hash filenames that carry no semantic meaning. */
function isUuidLike(s: string): boolean {
  const stripped = s.trim().replace(/\.[a-z0-9]+$/i, '');
  if (/^(file_)?[0-9a-f]{8}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{12}$/i.test(stripped)) return true;
  if (/^[0-9a-f_-]{20,}$/i.test(stripped)) return true;
  return false;
}

function normalizeFilename(filename: string): string {
  const noExt = filename.replace(/\.[a-z0-9]+$/i, '');
  if (isUuidLike(noExt)) return '';
  const spaced = noExt.replace(/[_-]+/g, ' ').trim();
  const titleCased = spaced
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return titleCased.slice(0, 60);
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function heuristicSuggest(input: { title?: string; filename?: string; ocrText?: string; mimeType?: string }): SuggestResult {
  const filename = input.filename ? normalizeFilename(input.filename) : '';
  const rawTitle = input.title?.trim() ?? '';
  const cleanTitle = (isUuidLike(rawTitle.replace(/\.[a-z0-9]+$/i, '')) || isFallbackTitle(rawTitle)) ? '' : rawTitle;
  const title = cleanTitle || filename;

  const text = `${title}\n${input.ocrText ?? ''}`;
  const category = CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'other';

  const firstOcrLine = input.ocrText
    ?.split('\n')
    .map(l => l.trim())
    .find(l => l.length >= 4 && !/^[\d\s.,\-/]+$/.test(l) && !isUuidLike(l));

  const now = new Date();
  const monthYear = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const typeLabel = category !== 'other'
    ? `${category.charAt(0).toUpperCase()}${category.slice(1)} Document`
    : input.mimeType?.includes('pdf') ? 'PDF Document' : 'Scanned Document';
  const fallbackTitle = `${typeLabel} — ${monthYear}`;

  const baseTitle = title || firstOcrLine || fallbackTitle;

  const tags: string[] = [];
  if (category !== 'other') tags.push(category);
  if (/\b(expire|expires|expiration)\b/i.test(text)) tags.push('expires');
  if (/\b(total|subtotal|amount due)\b/i.test(text)) tags.push('amount');
  if (/\b(invoice|bill)\b/i.test(text)) tags.push('invoice');
  if (/\b(statement)\b/i.test(text)) tags.push('statement');
  if (/\b(renewal|renew)\b/i.test(text)) tags.push('renewal');
  if (tags.length === 0) tags.push('review');

  return {
    suggestedTitle: baseTitle.slice(0, 120),
    suggestedFolderName: CATEGORY_FOLDER[category],
    category,
    tags,
    source: 'heuristic',
  };
}

/** Extract text from a PDF for the heuristic (no-API-key) path only. */
async function extractPdfText(base64: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const result = await pdfParse(buffer, { max: 5 });
    return result.text?.trim() ?? '';
  } catch {
    return '';
  }
}

const JSON_SCHEMA_PROMPT = `Analyse this document and respond with JSON containing exactly these fields:
- "title": a concise descriptive title (max 80 chars)
- "category": one of: receipt, contract, id, warranty, medical, tax, other
- "tags": array of 2-4 meaningful lowercase keyword tags (not just the category name or file type)
- "notes": one sentence describing any key detail worth remembering (amount, date, expiry, party name), or omit if nothing stands out`;

export async function suggestDocument(input: {
  title?: string;
  filename?: string;
  ocrText?: string;
  mimeType?: string;
  pdfBase64?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<SuggestResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  // Heuristic path: no API key, so extract PDF text the old way for keyword matching
  if (!apiKey) {
    let ocrText = input.ocrText?.trim();
    if (!ocrText && input.pdfBase64) {
      ocrText = await extractPdfText(input.pdfBase64);
    }
    return heuristicSuggest({ ...input, ocrText });
  }

  // Claude path: determine what file content we have
  const hasPdf = !!input.pdfBase64;
  const hasImage = !!(input.imageBase64 && input.imageMimeType && SUPPORTED_IMAGE_MIMES.has(input.imageMimeType));
  const ocrText = input.ocrText?.trim();
  const hasOcr = !!(ocrText && ocrText.length > 20);

  const cleanFilename = input.filename ? normalizeFilename(input.filename) : '';
  const rawTitle = input.title?.trim() ?? '';
  const cleanTitle = (isUuidLike(rawTitle.replace(/\.[a-z0-9]+$/i, '')) || isFallbackTitle(rawTitle)) ? '' : rawTitle;
  const contextLabel = cleanTitle || cleanFilename;

  if (!hasPdf && !hasImage && !hasOcr && !contextLabel) {
    return heuristicSuggest({ ...input, ocrText });
  }

  try {
    const client = new Anthropic({ apiKey });
    let rawText = '';

    if (hasPdf) {
      // Send the PDF directly — Claude reads it natively without text extraction
      const response = await (client as any).beta.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 256,
        betas: ['pdfs-2024-09-25'],
        system: 'You are a document classification assistant. Always respond with valid JSON only, no markdown.',
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.pdfBase64 } },
            { type: 'text', text: JSON_SCHEMA_PROMPT },
          ],
        }],
      });
      rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';

    } else if (hasImage) {
      // Send the image directly — Claude reads it with vision
      const contentBlocks: unknown[] = [
        {
          type: 'image',
          source: { type: 'base64', media_type: input.imageMimeType, data: input.imageBase64 },
        },
      ];
      // Include OCR text as supplemental context if available
      const prompt = hasOcr
        ? `${JSON_SCHEMA_PROMPT}\n\nOCR-extracted text (use as additional context):\n${ocrText!.slice(0, 1000)}`
        : JSON_SCHEMA_PROMPT;
      contentBlocks.push({ type: 'text', text: prompt });

      const response = await client.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 256,
        system: 'You are a document classification assistant. Always respond with valid JSON only, no markdown.',
        messages: [{ role: 'user', content: contentBlocks as Anthropic.MessageParam['content'] }],
      });
      rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    } else if (hasOcr) {
      // Text from OCR — no file content available
      const response = await client.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 256,
        system: 'You are a document classification assistant. Always respond with valid JSON only, no markdown.',
        messages: [{ role: 'user', content: `${JSON_SCHEMA_PROMPT}\n\nDocument text:\n${ocrText!.slice(0, 2000)}` }],
      });
      rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    } else {
      // Filename / MIME type only — no file content and no OCR
      const response = await client.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 256,
        system: 'You are a document classification assistant. Always respond with valid JSON only, no markdown.',
        messages: [{
          role: 'user',
          content: `Based on this file information, suggest document metadata.\n${JSON_SCHEMA_PROMPT}\n\nFile name: ${contextLabel}\nFile type: ${input.mimeType || 'unknown'}`,
        }],
      });
      rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    }

    const parsed = JSON.parse(extractJsonObject(rawText));

    const category: DocumentCategory = VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : 'other';
    const tags: string[] = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown) => typeof t === 'string').slice(0, 4)
      : (category !== 'other' ? [category] : ['review']);
    const suggestedTitle: string = typeof parsed.title === 'string' && parsed.title.trim()
      ? parsed.title.trim().slice(0, 120)
      : heuristicSuggest({ ...input, ocrText }).suggestedTitle;
    const notes: string | undefined = typeof parsed.notes === 'string' && parsed.notes.trim()
      ? parsed.notes.trim().slice(0, 300)
      : undefined;

    return { suggestedTitle, suggestedFolderName: CATEGORY_FOLDER[category], category, tags, notes, source: 'claude' };
  } catch {
    return heuristicSuggest({ ...input, ocrText: input.ocrText?.trim() });
  }
}
