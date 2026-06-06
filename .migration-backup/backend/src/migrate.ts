import 'dotenv/config';
import { PostgresStore } from './postgresStore.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log('DATABASE_URL is not set; skipping Postgres migrations.');
  process.exit(0);
}

const store = new PostgresStore(databaseUrl);
await store.migrate();
await store.close();
console.log('Database migrations complete.');
