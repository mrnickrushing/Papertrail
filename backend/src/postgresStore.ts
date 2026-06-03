import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { MIGRATIONS } from './migrations.js';
import type { PapertrailStore, SyncPullOutput, SyncPushInput } from './storeInterface.js';
import type { AnalyticsRecord, EmailInboundRecord, ShareLinkRecord } from './types.js';

const { Pool } = pg;

export class PostgresStore implements PapertrailStore {
  private readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }

  async init(): Promise<void> {
    await this.migrate();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const migration of MIGRATIONS) {
        const existing = await client.query('SELECT id FROM schema_migrations WHERE id = $1', [migration.id]);
        if (existing.rowCount === 0) {
          await client.query(migration.sql);
          await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async push(input: SyncPushInput): Promise<{ syncVersion: number }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      let syncVersion = await this.currentVersion(client);

      for (const folder of input.folders) {
        syncVersion += 1;
        const payload = { ...folder, syncVersion };
        await client.query(
          `INSERT INTO folders (id, payload, sync_version, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE
           SET payload = EXCLUDED.payload,
               sync_version = EXCLUDED.sync_version,
               updated_at = EXCLUDED.updated_at`,
          [folder.id, JSON.stringify(payload), syncVersion, folder.updatedAt],
        );
      }

      for (const document of input.documents) {
        syncVersion += 1;
        const payload = { ...document, syncVersion };
        await client.query(
          `INSERT INTO documents (id, payload, sync_version, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE
           SET payload = EXCLUDED.payload,
               sync_version = EXCLUDED.sync_version,
               updated_at = EXCLUDED.updated_at`,
          [document.id, JSON.stringify(payload), syncVersion, document.updatedAt],
        );
      }

      for (const id of input.deletedDocumentIds) {
        syncVersion += 1;
        const deletedAt = new Date().toISOString();
        await client.query('DELETE FROM documents WHERE id = $1', [id]);
        await client.query(
          `INSERT INTO tombstones (id, kind, deleted_at, sync_version)
           VALUES ($1, 'document', $2, $3)
           ON CONFLICT (id, kind) DO UPDATE
           SET deleted_at = EXCLUDED.deleted_at,
               sync_version = EXCLUDED.sync_version`,
          [id, deletedAt, syncVersion],
        );
      }

      for (const id of input.deletedFolderIds) {
        syncVersion += 1;
        const deletedAt = new Date().toISOString();
        await client.query('DELETE FROM folders WHERE id = $1', [id]);
        await client.query(
          `INSERT INTO tombstones (id, kind, deleted_at, sync_version)
           VALUES ($1, 'folder', $2, $3)
           ON CONFLICT (id, kind) DO UPDATE
           SET deleted_at = EXCLUDED.deleted_at,
               sync_version = EXCLUDED.sync_version`,
          [id, deletedAt, syncVersion],
        );
      }

      await client.query('UPDATE sync_state SET sync_version = $1 WHERE id = true', [syncVersion]);
      await client.query('COMMIT');
      return { syncVersion };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async pull(sinceVersion: number): Promise<SyncPullOutput> {
    const [state, documents, folders, tombstones] = await Promise.all([
      this.pool.query<{ sync_version: string }>('SELECT sync_version FROM sync_state WHERE id = true'),
      this.pool.query<{ payload: unknown }>('SELECT payload FROM documents WHERE sync_version > $1 ORDER BY sync_version ASC', [sinceVersion]),
      this.pool.query<{ payload: unknown }>('SELECT payload FROM folders WHERE sync_version > $1 ORDER BY sync_version ASC', [sinceVersion]),
      this.pool.query<{ id: string; kind: 'document' | 'folder'; deleted_at: Date; sync_version: string }>(
        'SELECT id, kind, deleted_at, sync_version FROM tombstones WHERE sync_version > $1 ORDER BY sync_version ASC',
        [sinceVersion],
      ),
    ]);

    return {
      syncVersion: Number(state.rows[0]?.sync_version ?? 0),
      documents: documents.rows.map((row) => row.payload as SyncPullOutput['documents'][number]),
      folders: folders.rows.map((row) => row.payload as SyncPullOutput['folders'][number]),
      tombstones: tombstones.rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        deletedAt: row.deleted_at.toISOString(),
        syncVersion: Number(row.sync_version),
      })),
    };
  }

  async createShareLink(input: Omit<ShareLinkRecord, 'token' | 'createdAt'>): Promise<ShareLinkRecord> {
    const token = randomUUID().replace(/-/g, '');
    const createdAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO share_links (token, document_id, title, expires_at, password_protected, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [token, input.documentId, input.title, input.expiresAt, input.passwordProtected, createdAt],
    );
    return { ...input, token, createdAt };
  }

  async getShareLink(token: string): Promise<ShareLinkRecord | null> {
    const res = await this.pool.query<{
      token: string;
      document_id: string;
      title: string;
      expires_at: Date;
      password_protected: boolean;
      created_at: Date;
    }>('SELECT * FROM share_links WHERE token = $1', [token]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      token: row.token,
      documentId: row.document_id,
      title: row.title,
      expiresAt: row.expires_at.toISOString(),
      passwordProtected: row.password_protected,
      createdAt: row.created_at.toISOString(),
    };
  }

  async addInboundEmail(input: Omit<EmailInboundRecord, 'id' | 'receivedAt'>): Promise<EmailInboundRecord> {
    const id = randomUUID();
    const receivedAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO inbound_emails (id, sender, subject, attachments, received_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, input.sender, input.subject, JSON.stringify(input.attachments), receivedAt],
    );
    return { ...input, id, receivedAt };
  }

  async addAnalytics(events: Array<Omit<AnalyticsRecord, 'id' | 'createdAt'>>): Promise<number> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const event of events) {
        await client.query(
          `INSERT INTO analytics_events (id, event, device_id, user_id, properties, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            randomUUID(),
            event.event,
            event.deviceId ?? null,
            event.userId ?? null,
            event.properties ? JSON.stringify(event.properties) : null,
            new Date().toISOString(),
          ],
        );
      }
      await client.query('COMMIT');
      return events.length;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async currentVersion(client: pg.PoolClient): Promise<number> {
    const res = await client.query<{ sync_version: string }>(
      'SELECT sync_version FROM sync_state WHERE id = true FOR UPDATE',
    );
    return Number(res.rows[0]?.sync_version ?? 0);
  }
}
