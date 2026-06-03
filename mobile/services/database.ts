/**
 * Deprecated SQLite database service.
 *
 * PaperTrail currently persists document metadata through the local-first
 * Zustand store in `store/documentStore.ts`. Keep this file as a marker so
 * older references fail closed instead of creating a second incompatible schema.
 */

export async function initDatabase(): Promise<void> {}
export function searchDocuments(): never[] { return []; }
