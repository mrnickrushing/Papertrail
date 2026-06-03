import 'dotenv/config';

export type RuntimeConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  corsOrigins: string[];
  apiKey: string | null;
  dataDir: string;
  databaseUrl: string | null;
  publicAppUrl: string;
  integrations: {
    supabase: boolean;
    r2: boolean;
    openai: boolean;
    postmark: boolean;
  };
};

function boolFromEnv(...keys: string[]): boolean {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

export function loadConfig(): RuntimeConfig {
  const corsRaw = process.env.CORS_ORIGINS?.trim() || '*';

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT || 4000),
    corsOrigins: corsRaw === '*' ? ['*'] : corsRaw.split(',').map((origin) => origin.trim()).filter(Boolean),
    apiKey: process.env.API_KEY?.trim() || null,
    dataDir: process.env.DATA_DIR || '.data',
    databaseUrl: process.env.DATABASE_URL?.trim() || null,
    publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:4000',
    integrations: {
      supabase: boolFromEnv('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'),
      r2: boolFromEnv(
        'CLOUDFLARE_R2_ACCOUNT_ID',
        'CLOUDFLARE_R2_ACCESS_KEY_ID',
        'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
        'CLOUDFLARE_R2_BUCKET',
      ),
      openai: boolFromEnv('OPENAI_API_KEY'),
      postmark: boolFromEnv('POSTMARK_INBOUND_TOKEN'),
    },
  };
}
