import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { PostgresStore } from './postgresStore.js';

const config = loadConfig();
const store = config.databaseUrl ? new PostgresStore(config.databaseUrl) : undefined;
const app = await buildApp(config, store);

await app.listen({ host: config.host, port: config.port });
