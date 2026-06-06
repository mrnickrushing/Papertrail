import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { MIGRATIONS } from './migrations.js';
import type { FiletrailStore, SyncPullOutput, SyncPushInput } from './storeInterface.js';
import type {
  AnalyticsRecord,
  EmailInboundRecord,
  ShareLinkCreateInput,
  ShareLinkRecord,
  ShareLinkStoreRecord,
  UserRecord,
} from './types.js';
import { toPublicShareLinkRecord } from './shareLinks.js';

const { Pool } = pg;

export class PostgresStore implements FiletrailStore {
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
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id integer PRIMARY KEY,
          applied_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await client.query('BEGIN');
      for (const migration of MIGRATIONS) {
        const existing = await client.query('SELECT id FROM schema_migrations WHERE id = $1', [migration.id]);
        if (!existing.rowCount) {
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

  async createShareLink(input: ShareLinkCreateInput): Promise<ShareLinkRecord> {
    const token = randomUUID().replace(/-/g, '');
    const createdAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO share_links (token, document_id, title, expires_at, password_protected, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [token, input.documentId, input.title, input.expiresAt, Boolean(input.passwordHash), input.passwordHash ?? null, createdAt],
    );
    return {
      token,
      documentId: input.documentId,
      title: input.title,
      expiresAt: input.expiresAt,
      passwordProtected: Boolean(input.passwordHash),
      createdAt,
    };
  }

  async getShareLink(token: string): Promise<ShareLinkStoreRecord | null> {
    const res = await this.pool.query<{
      token: string;
      document_id: string;
      title: string;
      expires_at: Date;
      password_protected: boolean;
      password_hash: string | null;
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
      passwordHash: row.password_hash ?? undefined,
      createdAt: row.created_at.toISOString(),
    };
  }

  async listShareLinks(limit = 200): Promise<ShareLinkRecord[]> {
    const res = await this.pool.query<{
      token: string;
      document_id: string;
      title: string;
      expires_at: Date;
      password_protected: boolean;
      password_hash: string | null;
      created_at: Date;
    }>(
      `SELECT token, document_id, title, expires_at, password_protected, password_hash, created_at
       FROM share_links
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );

    return res.rows.map((row) => toPublicShareLinkRecord({
      token: row.token,
      documentId: row.document_id,
      title: row.title,
      expiresAt: row.expires_at.toISOString(),
      passwordProtected: row.password_protected,
      passwordHash: row.password_hash ?? undefined,
      createdAt: row.created_at.toISOString(),
    }));
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

  async getAnalytics(limit = 500): Promise<AnalyticsRecord[]> {
    const res = await this.pool.query<{
      id: string; event: string; device_id: string | null; user_id: string | null;
      properties: string | null; created_at: string;
    }>(
      'SELECT id, event, device_id, user_id, properties, created_at FROM analytics_events ORDER BY created_at DESC LIMIT $1',
      [limit],
    );
    return res.rows.map(r => ({
      id: r.id,
      event: r.event,
      deviceId: r.device_id ?? undefined,
      userId: r.user_id ?? undefined,
      properties: r.properties ? JSON.parse(r.properties) : undefined,
      createdAt: r.created_at,
    }));
  }

  async registerUser(input: Omit<UserRecord, 'isPro' | 'createdAt'>): Promise<UserRecord> {
    const createdAt = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO users (id, full_name, email, password_hash, provider, apple_user_id, is_pro, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7)
       ON CONFLICT (email) DO NOTHING`,
      [input.id, input.fullName, input.email, input.passwordHash, input.provider, input.appleUserId ?? null, createdAt],
    );
    const existing = await this.getUserByEmail(input.email);
    if (!existing) throw new Error('Registration failed');
    return existing;
  }

  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const res = await this.pool.query<{
      id: string; full_name: string; email: string; password_hash: string;
      provider: string; apple_user_id: string | null; is_pro: boolean; created_at: Date;
    }>('SELECT * FROM users WHERE email = $1', [email]);
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      passwordHash: row.password_hash,
      provider: row.provider as 'email' | 'apple',
      appleUserId: row.apple_user_id ?? undefined,
      isPro: row.is_pro,
      createdAt: row.created_at.toISOString(),
    };
  }

  async listUsers(limit = 500): Promise<UserRecord[]> {
    const res = await this.pool.query<{
      id: string; full_name: string; email: string; password_hash: string;
      provider: string; apple_user_id: string | null; is_pro: boolean; created_at: Date;
    }>('SELECT * FROM users ORDER BY created_at DESC LIMIT $1', [limit]);
    return res.rows.map(row => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      passwordHash: row.password_hash,
      provider: row.provider as 'email' | 'apple',
      appleUserId: row.apple_user_id ?? undefined,
      isPro: row.is_pro,
      createdAt: row.created_at.toISOString(),
    }));
  }

  private async currentVersion(client: pg.PoolClient): Promise<number> {
    const res = await client.query<{ sync_version: string }>(
      'SELECT sync_version FROM sync_state WHERE id = true FOR UPDATE',
    );
    return Number(res.rows[0]?.sync_version ?? 0);
  }
}
