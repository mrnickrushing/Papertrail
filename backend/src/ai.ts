import Anthropic from '@anthropic-ai/sdk';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse') as (buffer: Buffer, options?: { max?: number }) => Promise<{ text: string }>;
import type { DocumentCategory } from './types.js';

const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL?.trim() || 'claude-haiku-4-5-20251001';

// Claude Haiku 4.5 pricing — used to estimate the cost of each AI classification call.
const INPUT_COST_PER_MTOK = 1.00;
const OUTPUT_COST_PER_MTOK = 5.00;

function calcCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * INPUT_COST_PER_MTOK + (outputTokens / 1_000_000) * OUTPUT_COST_PER_MTOK;
}

const VALID_CATEGORIES: DocumentCategory[] = [
  'receipt', 'bill', 'contract', 'id', 'warranty', 'medical', 'tax', 'work', 'retirement',
  'insurance', 'legal', 'vehicle', 'property', 'education', 'travel', 'pet', 'other',
];

const CATEGORY_KEYWORDS: Array<[DocumentCategory, RegExp]> = [
  ['pet', /\b(veterinar\w*|vaccination record|rabies (?:certificate|vaccine|tag)|microchip (?:number|registration)|pet adoption|animal hospital|pet insurance|spay\/?neuter|pedigree (?:certificate|papers)|pet license)\b/i],
  ['education', /\b(diploma|transcript|degree conferred|enrollment (?:verification|confirmation)|student loan|\bfafsa\b|tuition (?:statement|invoice|bill)|report card|certificate of completion|continuing education credits|alumni association)\b/i],
  ['travel', /\b(passport (?:renewal|application)|visa (?:application|approval)|itinerary|boarding pass|e-?ticket|flight confirmation|hotel (?:confirmation|reservation)|travel insurance|customs declaration|immigration (?:form|document)|tsa pre.?check|global entry)\b/i],
  ['vehicle', /\b(vehicle (?:registration|title)|license plate|\bvin\b|odometer (?:reading|disclosure)|department of motor vehicles|\bdmv\b|lienholder|auto loan|car loan|smog (?:check|certificate)|emissions test|certificate of title)\b/i],
  ['legal', /\b(last will(?: and testament)?|living will|power of attorney|notariz\w*|notary public|estate plan\w*|executor|probate|legal guardian\w*|custody (?:agreement|arrangement|order)|divorce (?:decree|filing|petition)|court order|restraining order|small claims|judgment|decree|stipulation|legal counsel|plaintiff|defendant|attorney(?:'s fees)?|lawsuit|affidavit|docket|subpoena|deposition)\b/i],
  ['insurance', /\b(insurance (?:policy|premium|claim|card)|policy number|premium (?:due|payment|amount)|deductible|insured (?:party|individual)|policyholder|underwrit\w*|explanation of benefits|\beob\b|co-?pay(?:ment)?|claim number|beneficiary designation)\b/i],
  ['bill', /\b(account number|statement balance|new balance|minimum payment|payment due|amount due|balance due|past due|autopay|auto-pay|billing (?:period|cycle|statement)|monthly statement|utility bill|electric(?:ity)? bill|gas bill|water bill|phone bill|internet bill|cable bill|credit card statement|mortgage statement)\b/i],
  ['retirement', /\b(401\(?k\)?|403\(?b\)?|\bira\b|roth ira|pension|retirement (?:plan|account|savings|benefits?)|annuity|social security (?:benefits?|administration|statement)|vested balance|required minimum distribution|\brmd\b|defined benefit|defined contribution|rollover)\b/i],
  ['property', /\b(property deed|deed of trust|mortgage (?:agreement|application|approval)|lease agreement|rental agreement|landlord|tenant|closing disclosure|title insurance|homeowners association|\bhoa\b|escrow (?:account|statement)|home inspection|real estate (?:purchase|closing)|security deposit)\b/i],
  ['receipt', /\b(receipt|subtotal|total|paid|visa|mastercard|store)\b/i],
  ['contract', /\b(contract|agreement|signature|party|terms)\b/i],
  ['id', /\b(driver|license|passport|identification|dob)\b/i],
  ['warranty', /\b(warranty|serial|coverage|expires)\b/i],
  ['medical', /\b(patient|medical|clinic|hospital|diagnosis|rx|emergency|urgent care|panel|specimen|lab(?:oratory)?|glucose|cholesterol|triglycerides?|hdl|ldl|hemoglobin|a1c|metabolic|lipid|blood (?:work|test|count)|reference range|physician|provider|doctor|prescri\w*)\b|\bE\.?R\.?\b/i],
  ['work', /\b(pay ?stub|payslip|earnings statement|employee|employer|employment (?:agreement|contract|offer|verification)|offer letter|performance review|onboarding|timesheet|direct deposit|human resources|\bhr\b|job offer|termination letter|resignation letter|w-?4|i-9)\b/i],
  ['tax', /\b(tax|irs|w-?2|1099|deduction|return)\b/i],
];

const CATEGORY_FOLDER: Record<DocumentCategory, string> = {
  receipt: 'Receipts',
  bill: 'Bills',
  contract: 'Contracts',
  id: 'IDs',
  warranty: 'Warranties',
  medical: 'Medical Records',
  tax: 'Tax Documents',
  work: 'Work',
  retirement: 'Retirement',
  insurance: 'Insurance',
  legal: 'Legal',
  vehicle: 'Vehicle',
  property: 'Property',
  education: 'Education',
  travel: 'Travel',
  pet: 'Pets',
  other: 'Other Documents',
};

const SUPPORTED_IMAGE_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
]);

type SuggestResult = {
  suggestedTitle: string;
  suggestedFolderName: string;
  suggestedSubfolderName?: string;
  category: DocumentCategory;
  tags: string[];
  notes?: string;
  date?: string;
  vendor?: string;
  amounts?: number[];
  source: 'heuristic' | 'claude';
  usage?: { inputTokens: number; outputTokens: number; costUsd: number };
};

/** Detect auto-generated fallback titles — heuristic format OR generateTitle() format from the mobile app. */
function isFallbackTitle(s: string): boolean {
  const t = s.trim();
  // Heuristic backend format: "PDF Document — Jun 2026"
  if (/^(?:PDF|Scanned|Receipt|Bill|Contract|Id|Warranty|Medical|Tax|Work|Retirement|Insurance|Legal|Vehicle|Property|Education|Travel|Pet|Other) Document — [A-Z][a-z]+ \d{4}$/.test(t)) return true;
  // Mobile generateTitle() format: "Document Jun 6, 2026" / "Scan Jun 6, 2026" / etc.
  if (/^(?:Document|Scan|Photo|Import) [A-Z][a-z]+ \d{1,2}, \d{4}$/.test(t)) return true;
  return false;
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
    .map(w => w === w.toUpperCase() && w.length > 1 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
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
  if (input.mimeType?.includes('pdf')) tags.push('pdf');
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
    const result = await pdfParse(buffer, { max: 10 });
    return result.text?.trim() ?? '';
  } catch {
    return '';
  }
}

function buildSchemaPrompt(existingFolders?: string[]): string {
  const folderGuidance = existingFolders?.length
    ? ` The user already has these folders: ${existingFolders.map(f => `"${f}"`).join(', ')} — if one of them is a good fit for this document, reuse its exact name rather than inventing a new one; only suggest a different name when none of the existing ones fit well.`
    : '';

  return `Analyse this document and respond with JSON containing exactly these fields:
- "title": a concise descriptive title (max 80 chars)
- "category": one of: receipt, bill, contract, id, warranty, medical, tax, work, retirement, insurance, legal, vehicle, property, education, travel, pet, other — guidance on overlapping types:
  - "bill" for recurring statements/invoices like utilities, credit cards, rent, mortgage, or subscriptions; "receipt" for one-time purchase proofs
  - "work" for employment documents like pay stubs, offer letters, performance reviews, or HR paperwork; "retirement" for 401(k)/pension/IRA/social security statements and plan documents
  - "insurance" for policies, premium statements, claims, EOBs, and ID cards (health, auto, home, life) — even if they look like bills or medical paperwork
  - "legal" for wills, power of attorney, court filings, custody/divorce papers, and other legal-process documents — use "contract" only for everyday agreements (leases, service/vendor agreements, NDAs) that aren't part of a legal proceeding or estate plan
  - "vehicle" for registration, title, DMV paperwork, auto loans, and maintenance/inspection records; "property" for home deeds, mortgages (the agreement itself, not the monthly statement), leases, closing documents, and HOA paperwork
  - "education" for diplomas, transcripts, report cards, student loans, and tuition statements
  - "travel" for itineraries, boarding passes, visas, and trip confirmations — use "id" for passports and other identity documents
  - "pet" for veterinary records, vaccination/adoption papers, and pet insurance
- "tags": array of 2-4 meaningful lowercase keyword tags (not just the category name or file type)
- "notes": one sentence describing any key detail worth remembering (amount, date, expiry, party name), or omit if nothing stands out
- "date": most relevant date found on the document in YYYY-MM-DD format, or omit if none
- "vendor": merchant, organization, or issuing party name, or omit if not applicable
- "amounts": array of numeric monetary values (no currency symbols, e.g. [142.50, 9.99]), or omit if none
- "folderName": the folder to file this in — use the standard name for the category (e.g. "Receipts", "Contracts", "Tax Documents", "Medical Records") but use a more specific name when clearly appropriate (e.g. "Court Documents" for legal filings, "Insurance" for insurance docs); keep it short.${folderGuidance}
- "subfolderName": for medical documents, the patient's full name as it appears on the document, for use as a subfolder name; omit if not a medical document or if no patient name is found`;
}

export async function suggestDocument(input: {
  title?: string;
  filename?: string;
  ocrText?: string;
  mimeType?: string;
  pdfBase64?: string;
  imageBase64?: string;
  imageMimeType?: string;
  anthropicApiKey?: string;
  existingFolders?: string[];
}): Promise<SuggestResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || input.anthropicApiKey?.trim();

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
    const schemaPrompt = buildSchemaPrompt(input.existingFolders);
    let rawText = '';
    let usage: { input_tokens: number; output_tokens: number } | undefined;

    if (hasPdf) {
      // Send the PDF directly — Claude reads it natively without text extraction
      const response = await client.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 512,
        system: 'You are a document classification assistant. Always respond with valid JSON only, no markdown.',
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.pdfBase64 } },
            { type: 'text', text: `${schemaPrompt}${contextLabel ? `\n\nFilename hint: ${contextLabel}` : ''}` },
          ] as unknown as Anthropic.MessageParam['content'],
        }],
      });
      rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';
      usage = response.usage;

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
        ? `${schemaPrompt}${contextLabel ? `\n\nFilename hint: ${contextLabel}` : ''}\n\nOCR-extracted text (use as additional context):\n${ocrText!.slice(0, 2000)}`
        : `${schemaPrompt}${contextLabel ? `\n\nFilename hint: ${contextLabel}` : ''}`;
      contentBlocks.push({ type: 'text', text: prompt });

      const response = await client.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 512,
        system: 'You are a document classification assistant. Always respond with valid JSON only, no markdown.',
        messages: [{ role: 'user', content: contentBlocks as Anthropic.MessageParam['content'] }],
      });
      rawText = response.content[0].type === 'text' ? response.content[0].text : '';
      usage = response.usage;

    } else if (hasOcr) {
      // Text from OCR — no file content available
      const response = await client.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 512,
        system: 'You are a document classification assistant. Always respond with valid JSON only, no markdown.',
        messages: [{ role: 'user', content: `${schemaPrompt}\n\nDocument text:\n${ocrText!.slice(0, 2000)}` }],
      });
      rawText = response.content[0].type === 'text' ? response.content[0].text : '';
      usage = response.usage;

    } else {
      // Filename / MIME type only — no file content and no OCR
      const response = await client.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        max_tokens: 512,
        system: 'You are a document classification assistant. Always respond with valid JSON only, no markdown.',
        messages: [{
          role: 'user',
          content: `Based on this file information, suggest document metadata.\n${schemaPrompt}\n\nFile name: ${contextLabel}\nFile type: ${input.mimeType || 'unknown'}`,
        }],
      });
      rawText = response.content[0].type === 'text' ? response.content[0].text : '';
      usage = response.usage;
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
    const date: string | undefined = typeof parsed.date === 'string' && parsed.date.trim()
      ? parsed.date.trim().slice(0, 20)
      : undefined;
    const vendor: string | undefined = typeof parsed.vendor === 'string' && parsed.vendor.trim()
      ? parsed.vendor.trim().slice(0, 100)
      : undefined;
    const amounts: number[] | undefined = Array.isArray(parsed.amounts)
      ? parsed.amounts.filter((a: unknown) => typeof a === 'number' && Number.isFinite(a) && a >= 0).slice(0, 10)
      : undefined;
    const suggestedFolderName: string = typeof parsed.folderName === 'string' && parsed.folderName.trim()
      ? parsed.folderName.trim().slice(0, 80)
      : CATEGORY_FOLDER[category];
    const suggestedSubfolderName: string | undefined = typeof parsed.subfolderName === 'string' && parsed.subfolderName.trim()
      ? parsed.subfolderName.trim().slice(0, 80)
      : undefined;

    const usageResult = usage
      ? {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          costUsd: calcCostUsd(usage.input_tokens, usage.output_tokens),
        }
      : undefined;

    return { suggestedTitle, suggestedFolderName, suggestedSubfolderName, category, tags, notes, date, vendor, amounts, source: 'claude', usage: usageResult };
  } catch (err) {
    console.error('[ai.suggestDocument] Claude call failed, falling back to heuristics:', err instanceof Error ? err.message : err);
    return heuristicSuggest({ ...input, ocrText: input.ocrText?.trim() });
  }
}
