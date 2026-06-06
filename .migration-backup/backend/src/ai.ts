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

type SuggestResult = {
  suggestedTitle: string;
  category: DocumentCategory;
  tags: string[];
  source: 'heuristic' | 'claude';
};

function normalizeFilename(filename: string): string {
  return filename
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function heuristicSuggest(input: { title?: string; filename?: string; ocrText?: string; mimeType?: string }): SuggestResult {
  const filename = input.filename ? normalizeFilename(input.filename) : '';
  const title = input.title?.trim() || filename;
  const text = `${title}\n${input.ocrText ?? ''}`;
  const category = CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'other';
  const firstLine = input.ocrText?.split('\n').map((l) => l.trim()).find(Boolean);
  const baseTitle = title || firstLine || (input.mimeType?.includes('pdf') ? 'Document' : 'Scan');

  const tags = new Set<string>();
  tags.add(category);
  if (/\b(expire|expires|expiration)\b/i.test(text)) tags.add('expires');
  if (/\b(total|subtotal|amount)\b/i.test(text)) tags.add('amount');
  if (input.mimeType?.includes('pdf')) tags.add('pdf');

  return { suggestedTitle: baseTitle.slice(0, 120), category, tags: Array.from(tags), source: 'heuristic' };
}

async function extractPdfText(base64: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, 'base64');
    const result = await pdfParse(buffer, { max: 5 });
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
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  let ocrText = input.ocrText?.trim();
  if (!ocrText && input.pdfBase64) {
    ocrText = await extractPdfText(input.pdfBase64);
  }

  if (!apiKey || !ocrText) {
    return heuristicSuggest({ ...input, ocrText });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 256,
      system: 'You are a document classification assistant. Always respond with valid JSON only, no markdown.',
      messages: [{
        role: 'user',
        content: `Analyse this document text and respond with JSON containing exactly these fields:
- "title": a concise descriptive title (max 80 chars)
- "category": one of: receipt, contract, id, warranty, medical, tax, other
- "tags": array of 1-4 lowercase keyword tags

Document text:
${ocrText.slice(0, 2000)}`,
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
      : heuristicSuggest(input).suggestedTitle;

    return { suggestedTitle, category, tags, source: 'claude' };
  } catch {
    return heuristicSuggest(input);
  }
}
