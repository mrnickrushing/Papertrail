/**
 * PaperTrail — SQLite Database Service
 * Local-first storage. No network required.
 */
import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('papertrail.db');
  }
  return _db;
}

/**
 * Run all migrations in order.
 * Safe to call on every app launch — uses IF NOT EXISTS.
 */
export async function initDatabase(): Promise<void> {
  const db = getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS folders (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      parent_id   TEXT,
      color       TEXT NOT NULL DEFAULT '#D4A847',
      icon        TEXT NOT NULL DEFAULT 'folder',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id            TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      type          TEXT NOT NULL DEFAULT 'other',
      uri           TEXT NOT NULL,
      thumbnail_uri TEXT,
      ocr_text      TEXT,
      folder_id     TEXT,
      notes         TEXT,
      expiry_date   TEXT,
      reminder_date TEXT,
      is_favorited  INTEGER NOT NULL DEFAULT 0,
      is_encrypted  INTEGER NOT NULL DEFAULT 0,
      file_size     INTEGER NOT NULL DEFAULT 0,
      mime_type     TEXT NOT NULL DEFAULT 'application/pdf',
      page_count    INTEGER,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL UNIQUE,
      color      TEXT NOT NULL DEFAULT '#8A8680',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_tags (
      document_id TEXT NOT NULL,
      tag_id      TEXT NOT NULL,
      PRIMARY KEY (document_id, tag_id),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id)      REFERENCES tags(id)      ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id          TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      body        TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id              TEXT PRIMARY KEY,
      document_id     TEXT NOT NULL,
      title           TEXT NOT NULL,
      date            TEXT NOT NULL,
      notification_id TEXT,
      is_completed    INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_documents_folder   ON documents(folder_id);
    CREATE INDEX IF NOT EXISTS idx_documents_type     ON documents(type);
    CREATE INDEX IF NOT EXISTS idx_documents_expiry   ON documents(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_documents_favorited ON documents(is_favorited);
    CREATE INDEX IF NOT EXISTS idx_document_tags_doc  ON document_tags(document_id);
    CREATE INDEX IF NOT EXISTS idx_comments_doc       ON comments(document_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_doc      ON reminders(document_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_date     ON reminders(date);
  `);
}

/**
 * Full-text search across document titles and OCR content.
 */
export function searchDocuments(
  query: string,
  folderId?: string
): SQLite.SQLiteRunResult[] {
  const db = getDb();
  const term = `%${query}%`;

  if (folderId) {
    return db.getAllSync(
      `SELECT * FROM documents
       WHERE folder_id = ?
         AND (title LIKE ? OR ocr_text LIKE ?)
       ORDER BY updated_at DESC`,
      [folderId, term, term]
    ) as SQLite.SQLiteRunResult[];
  }

  return db.getAllSync(
    `SELECT * FROM documents
     WHERE title LIKE ? OR ocr_text LIKE ?
     ORDER BY updated_at DESC`,
    [term, term]
  ) as SQLite.SQLiteRunResult[];
}
