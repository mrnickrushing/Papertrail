/**
 * ocrQueue.ts — Background OCR processing queue
 *
 * Maintains a simple FIFO queue of document IDs that need OCR processing.
 * Documents enter the queue when added (status = 'pending') or retried
 * (status reset to 'pending'). A single worker processes one document at a
 * time to avoid starving the UI thread.
 *
 * In Expo Go the native OCR module is absent, so extractText() returns an
 * empty result; the queue still runs but documents end up with ocrStatus
 * 'done' and empty ocrText — which is correct for the stub build.
 */

import { extractText, extractMetadata } from './ocr';
import { useDocumentStore } from '@/store/documentStore';

type QueueEntry = { id: string; uri: string };

let queue: QueueEntry[] = [];
let running = false;

/** Enqueue a document for OCR. Safe to call multiple times — deduplicates by id and running status. */
export function enqueueOCR(id: string, uri: string): void {
  if (queue.some((e) => e.id === id)) return;
  // Also skip if this doc is already being processed (e.g. on app reopen)
  const store = useDocumentStore.getState();
  const doc = store.documents.find((d) => d.id === id);
  if (doc?.ocrStatus === 'processing') return;
  queue.push({ id, uri });
  if (!running) processNext();
}

/** Remove a document from the queue (e.g. when deleted). */
export function dequeueOCR(id: string): void {
  queue = queue.filter((e) => e.id !== id);
}

async function processNext(): Promise<void> {
  if (queue.length === 0) {
    running = false;
    return;
  }
  running = true;
  const entry = queue.shift()!;

  const { updateDocument } = useDocumentStore.getState();
  updateDocument(entry.id, { ocrStatus: 'processing' });

  try {
    const result = await extractText(entry.uri);
    const meta = result.text ? extractMetadata(result.text) : {};
    updateDocument(entry.id, {
      ocrStatus: 'done',
      ocrText: result.text || undefined,
      ...meta,
    });
  } catch {
    updateDocument(entry.id, { ocrStatus: 'failed' });
  }

  // Yield to the event loop then continue
  setTimeout(processNext, 50);
}
