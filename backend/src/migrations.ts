export const MIGRATIONS = [
  {
    id: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id integer PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS sync_state (
        id boolean PRIMARY KEY DEFAULT true,
        sync_version bigint NOT NULL DEFAULT 0,
        CONSTRAINT sync_state_singleton CHECK (id)
      );

      INSERT INTO sync_state (id, sync_version)
      VALUES (true, 0)
      ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS documents (
        id text PRIMARY KEY,
        payload jsonb NOT NULL,
        sync_version bigint NOT NULL,
        updated_at timestamptz NOT NULL
      );

      CREATE TABLE IF NOT EXISTS folders (
        id text PRIMARY KEY,
        payload jsonb NOT NULL,
        sync_version bigint NOT NULL,
        updated_at timestamptz NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tombstones (
        id text NOT NULL,
        kind text NOT NULL CHECK (kind IN ('document', 'folder')),
        deleted_at timestamptz NOT NULL,
        sync_version bigint NOT NULL,
        PRIMARY KEY (id, kind)
      );

      CREATE TABLE IF NOT EXISTS share_links (
        token text PRIMARY KEY,
        document_id text NOT NULL,
        title text NOT NULL,
        expires_at timestamptz NOT NULL,
        password_protected boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS inbound_emails (
        id uuid PRIMARY KEY,
        sender text NOT NULL,
        subject text NOT NULL,
        attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
        received_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS analytics_events (
        id uuid PRIMARY KEY,
        event text NOT NULL,
        device_id text,
        user_id text,
        properties jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS documents_sync_version_idx ON documents(sync_version);
      CREATE INDEX IF NOT EXISTS folders_sync_version_idx ON folders(sync_version);
      CREATE INDEX IF NOT EXISTS tombstones_sync_version_idx ON tombstones(sync_version);
      CREATE INDEX IF NOT EXISTS share_links_expires_at_idx ON share_links(expires_at);
      CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events(created_at);
    `,
  },
] as const;
