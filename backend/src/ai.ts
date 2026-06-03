import Anthropic from '@anthropic-ai/sdk';
import type { DocumentCategory } from './types.js';

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

function heuristicSuggest(input: { title?: string; ocrText?: string; mimeType?: string }): SuggestResult {
  const text = `${input.title ?? ''}\n${input.ocrText ?? ''}`;
  const category = CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'other';
  const firstLine = input.ocrText?.split('\n').map((l) => l.trim()).find(Boolean);
  const baseTitle = input.title?.trim() || firstLine || (input.mimeType?.includes('pdf') ? 'Document' : 'Scan');

  const tags = new Set<string>();
  tags.add(category);
  if (/\b(expire|expires|expiration)\b/i.test(text)) tags.add('expires');
  if (/\b(total|subtotal|amount)\b/i.test(text)) tags.add('amount');
  if (input.mimeType?.includes('pdf')) tags.add('pdf');

  return { suggestedTitle: baseTitle.slice(0, 120), category, tags: Array.from(tags), source: 'heuristic' };
}

export async function suggestDocument(input: {
  title?: string;
  ocrText?: string;
  mimeType?: string;
}): Promise<SuggestResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || !input.ocrText?.trim()) {
    return heuristicSuggest(input);
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: 'You are a document classification assistant. Always respond with valid JSON only, no markdown.',
      messages: [{
        role: 'user',
        content: `Analyse this document text and respond with JSON containing exactly these fields:
- "title": a concise descriptive title (max 80 chars)
- "category": one of: receipt, contract, id, warranty, medical, tax, other
- "tags": array of 1-4 lowercase keyword tags

Document text:
${input.ocrText.slice(0, 2000)}`,
      }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    const parsed = JSON.parse(raw);

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
