import type { DocumentCategory } from './types.js';

const VALID_CATEGORIES: DocumentCategory[] = [
  'receipt', 'contract', 'id', 'warranty', 'medical', 'tax', 'other',
];

const CATEGORY_KEYWORDS: Array<[DocumentCategory, RegExp]> = [
  ['receipt', /\b(receipt|subtotal|total|paid|visa|mastercard|store|invoice|purchase|order)\b/i],
  ['contract', /\b(contract|agreement|signature|party|parties|terms|clause|hereby|lease)\b/i],
  ['id', /\b(driver|license|passport|identification|dob|date of birth|id card|permit)\b/i],
  ['warranty', /\b(warranty|serial|coverage|expires|manufacturer|defect|repair)\b/i],
  ['medical', /\b(patient|medical|clinic|hospital|diagnosis|rx|prescription|physician|lab)\b/i],
  ['tax', /\b(tax|irs|w-?2|1099|deduction|return|refund|federal|state income)\b/i],
];

const CATEGORY_FOLDER_NAMES: Record<DocumentCategory, string> = {
  receipt: 'Receipts',
  contract: 'Contracts',
  id: 'IDs & Documents',
  warranty: 'Warranties',
  medical: 'Medical Records',
  tax: 'Tax Documents',
  other: 'Other',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GENERIC_FILENAME_PATTERN = /^(file|doc|document|scan|img|image|photo|capture|import|download)[_\-\s]?[0-9a-f\-]{8,}$/i;
const GENERIC_TITLE_PATTERN = /^(document|scan|photo|import|file)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[,/\-]\s?\d)/i;

export type SuggestResult = {
  suggestedTitle: string;
  category: DocumentCategory;
  tags: string[];
  notes: string;
  suggestedFolderName: string;
  source: 'heuristic' | 'anthropic';
};

function normalizeFilename(filename: string): string {
  return filename
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isJunkTitle(title: string): boolean {
  const stripped = title.replace(/\.[a-z0-9]+$/i, '').trim();
  if (UUID_PATTERN.test(stripped)) return true;
  if (GENERIC_FILENAME_PATTERN.test(stripped)) return true;
  return false;
}

function buildTitle(input: { title?: string; filename?: string; ocrText?: string; mimeType?: string; category: DocumentCategory }): string {
  const { title, filename, ocrText, mimeType, category } = input;

  if (ocrText) {
    const firstMeaningfulLine = ocrText
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 4 && l.length < 80 && !/^[\d\s\-\/:.]+$/.test(l));
    if (firstMeaningfulLine) {
      return firstMeaningfulLine.slice(0, 80);
    }
  }

  if (title && !isJunkTitle(title) && !GENERIC_TITLE_PATTERN.test(title)) {
    return title.slice(0, 80);
  }

  if (filename && !isJunkTitle(filename)) {
    const normalized = normalizeFilename(filename);
    if (normalized.length > 3 && !UUID_PATTERN.test(normalized)) {
      return normalized.slice(0, 80);
    }
  }

  const label = category === 'other' ? 'Document' :
    category === 'id' ? 'ID Document' :
    category.charAt(0).toUpperCase() + category.slice(1);

  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${label} — ${date}`;
}

function buildNotes(input: { category: DocumentCategory; ocrText?: string; tags: string[] }): string {
  const { category, ocrText, tags } = input;

  if (!ocrText) return '';

  const lines = ocrText.split('\n').map((l) => l.trim()).filter(Boolean);
  const snippet = lines.slice(0, 3).join('. ').slice(0, 200);
  if (!snippet) return '';

  const categoryNote = category !== 'other'
    ? `Categorized as ${category}`
    : 'Filed under Other';

  return `${categoryNote}. ${snippet}`.trim().slice(0, 300);
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
  const text = `${input.title ?? ''}\n${input.filename ?? ''}\n${input.ocrText ?? ''}`;
  const category = CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'other';

  const tags = new Set<string>();
  tags.add(category);
  if (/\b(expire|expires|expiration)\b/i.test(text)) tags.add('expires');
  if (/\b(total|subtotal|amount)\b/i.test(text)) tags.add('amount');
  if (input.mimeType?.includes('pdf')) tags.add('pdf');
  if (/\b(urgent|important)\b/i.test(text)) tags.add('important');

  const tagsArr = Array.from(tags);
  const suggestedTitle = buildTitle({ ...input, category });
  const notes = buildNotes({ category, ocrText: input.ocrText, tags: tagsArr });
  const suggestedFolderName = CATEGORY_FOLDER_NAMES[category];

  return { suggestedTitle, category, tags: tagsArr, notes, suggestedFolderName, source: 'heuristic' };
}

async function extractPdfText(base64: string): Promise<string> {
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pdfParse = require('pdf-parse') as (buf: Buffer, opts?: { max?: number }) => Promise<{ text: string }>;
    const buf = Buffer.from(base64, 'base64');
    const result = await pdfParse(buf, { max: 5 });
    return result.text?.trim() ?? '';
  } catch {
    return '';
  }
}

export async function suggestDocument(input: {
  title?: string;
  filename?: string;
  ocrText?: string;
  mimeType?: string;
  pdfBase64?: string;
}): Promise<SuggestResult> {
  let ocrText = input.ocrText?.trim();
  if (!ocrText && input.pdfBase64) {
    ocrText = await extractPdfText(input.pdfBase64);
  }
  const enriched = { ...input, ocrText };

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return heuristicSuggest(enriched);
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-haiku-20241022';

    const contextText = ocrText
      ? ocrText.slice(0, 2000)
      : `Filename: ${input.filename ?? input.title ?? 'unknown'}\nMIME type: ${input.mimeType ?? 'unknown'}`;

    const message = await client.messages.create({
      model,
      max_tokens: 512,
      system: 'You are a document filing assistant. Always respond with valid JSON only, no markdown or explanation.',
      messages: [{
        role: 'user',
        content: `Analyze this document and respond with JSON containing exactly these fields:
- "title": a concise, descriptive title (max 80 chars, avoid generic names like "Document Jun 5")
- "category": one of: receipt, contract, id, warranty, medical, tax, other
- "tags": array of 2-4 lowercase keyword tags
- "notes": 1-2 sentence description of the document content
- "suggestedFolderName": a short folder name to file this under (e.g. "Receipts", "Tax Documents", "Medical Records")

Document context:
${contextText}`,
      }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(extractJsonObject(raw));

    const category: DocumentCategory = VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : 'other';
    const tags: string[] = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown) => typeof t === 'string').slice(0, 4)
      : [category];
    const suggestedTitle: string = typeof parsed.title === 'string' && parsed.title.trim()
      ? parsed.title.trim().slice(0, 120)
      : buildTitle({ ...enriched, category });
    const notes: string = typeof parsed.notes === 'string' ? parsed.notes.trim().slice(0, 300) : '';
    const suggestedFolderName: string = typeof parsed.suggestedFolderName === 'string' && parsed.suggestedFolderName.trim()
      ? parsed.suggestedFolderName.trim().slice(0, 60)
      : CATEGORY_FOLDER_NAMES[category];

    return { suggestedTitle, category, tags, notes, suggestedFolderName, source: 'anthropic' };
  } catch {
    return heuristicSuggest(enriched);
  }
}
