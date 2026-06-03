import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';
import type { RuntimeConfig } from './config.js';
import { JsonStore } from './store.js';
import type { PapertrailStore } from './storeInterface.js';
import {
  aiSuggestSchema,
  analyticsBatchSchema,
  emailInboundSchema,
  shareLinkCreateSchema,
  syncPullSchema,
  syncPushSchema,
} from './schemas.js';
import { suggestDocument } from './ai.js';

function parseBody<T>(schema: { parse: (value: unknown) => T }, body: unknown): T {
  return schema.parse(body);
}

export async function buildApp(config: RuntimeConfig, store: PapertrailStore = new JsonStore(config.dataDir)): Promise<FastifyInstance> {
  await store.init();

  const app = Fastify({
    logger: config.nodeEnv !== 'test',
    bodyLimit: 10 * 1024 * 1024,
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
  });

  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/v1/') || !config.apiKey) return;
    const auth = request.headers.authorization;
    if (auth !== `Bearer ${config.apiKey}`) {
      await reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.get('/health', async () => ({
    ok: true,
    service: 'papertrail-backend',
    time: new Date().toISOString(),
    integrations: config.integrations,
  }));

  app.get('/v1/config', async () => ({
    apiVersion: 1,
    features: {
      sync: true,
      analytics: true,
      aiSuggestions: true,
      shareLinks: true,
      emailToVault: true,
      fileStorage: config.integrations.r2,
      auth: config.integrations.supabase,
    },
    integrations: config.integrations,
  }));

  app.post('/v1/sync/pull', async (request) => {
    const input = parseBody(syncPullSchema, request.body);
    const result = await store.pull(input.sinceVersion);
    return {
      ...result,
      serverTime: new Date().toISOString(),
    };
  });

  app.post('/v1/sync/push', async (request) => {
    const input = parseBody(syncPushSchema, request.body);
    const result = await store.push(input);
    return {
      ok: true,
      syncVersion: result.syncVersion,
      serverTime: new Date().toISOString(),
    };
  });

  app.post('/v1/ai/suggest-document', async (request) => {
    const input = parseBody(aiSuggestSchema, request.body);
    return suggestDocument(input);
  });

  app.post('/v1/share-links', async (request) => {
    const input = parseBody(shareLinkCreateSchema, request.body);
    const record = await store.createShareLink({
      documentId: input.documentId,
      title: input.title,
      expiresAt: input.expiresAt,
      passwordProtected: Boolean(input.password),
    });
    return {
      ...record,
      url: `${config.publicAppUrl.replace(/\/$/, '')}/share/${record.token}`,
    };
  });

  app.get('/v1/share-links/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const record = await store.getShareLink(token);
    if (!record) return reply.code(404).send({ error: 'Share link not found' });
    if (Date.parse(record.expiresAt) <= Date.now()) {
      return reply.code(410).send({ error: 'Share link expired' });
    }
    return record;
  });

  app.post('/v1/email/inbound', async (request) => {
    const input = parseBody(emailInboundSchema, request.body);
    const record = await store.addInboundEmail(input);
    return { ok: true, inboundId: record.id, receivedAt: record.receivedAt };
  });

  app.post('/v1/analytics/events', async (request) => {
    const input = parseBody(analyticsBatchSchema, request.body);
    const accepted = await store.addAnalytics(input.events);
    return { ok: true, accepted };
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: 'Invalid request', details: error.issues });
    }
    app.log.error(error);
    return reply.code(500).send({ error: 'Internal server error' });
  });

  return app;
}
