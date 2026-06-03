import type { DocumentCategory } from './types.js';

const CATEGORY_KEYWORDS: Array<[DocumentCategory, RegExp]> = [
  ['receipt', /\b(receipt|subtotal|total|paid|visa|mastercard|store)\b/i],
  ['contract', /\b(contract|agreement|signature|party|terms)\b/i],
  ['id', /\b(driver|license|passport|identification|dob)\b/i],
  ['warranty', /\b(warranty|serial|coverage|expires)\b/i],
  ['medical', /\b(patient|medical|clinic|hospital|diagnosis|rx)\b/i],
  ['tax', /\b(tax|irs|w-?2|1099|deduction|return)\b/i],
];

export function suggestDocument(input: {
  title?: string;
  ocrText?: string;
  mimeType?: string;
}): { suggestedTitle: string; category: DocumentCategory; tags: string[]; source: 'heuristic' | 'openai' } {
  const text = `${input.title ?? ''}\n${input.ocrText ?? ''}`;
  const category = CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'other';
  const firstLine = input.ocrText?.split('\n').map((line) => line.trim()).find(Boolean);
  const baseTitle = input.title?.trim() || firstLine || (input.mimeType?.includes('pdf') ? 'Document' : 'Scan');

  const tags = new Set<string>();
  tags.add(category);
  if (/\b(expire|expires|expiration)\b/i.test(text)) tags.add('expires');
  if (/\b(total|subtotal|amount)\b/i.test(text)) tags.add('amount');
  if (input.mimeType?.includes('pdf')) tags.add('pdf');

  return {
    suggestedTitle: baseTitle.slice(0, 120),
    category,
    tags: Array.from(tags),
    source: 'heuristic',
  };
}
