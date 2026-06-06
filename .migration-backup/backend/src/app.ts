import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';
import type { RuntimeConfig } from './config.js';
import { JsonStore } from './store.js';
import type { FiletrailStore } from './storeInterface.js';
import {
  aiSuggestSchema,
  analyticsBatchSchema,
  emailInboundSchema,
  shareLinkCreateSchema,
  syncPullSchema,
  syncPushSchema,
  userRegisterSchema,
  userLoginSchema,
} from './schemas.js';
import {
  hashShareLinkPassword,
  toPublicShareLinkRecord,
  verifyShareLinkPassword,
} from './shareLinks.js';
import { suggestDocument } from './ai.js';

function parseBody<T>(schema: { parse: (value: unknown) => T }, body: unknown): T {
  return schema.parse(body);
}

export async function buildApp(config: RuntimeConfig, store: FiletrailStore = new JsonStore(config.dataDir)): Promise<FastifyInstance> {
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
    service: 'filetrail-backend',
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
    return await suggestDocument(input);
  });

  app.post('/v1/share-links', async (request) => {
    const input = parseBody(shareLinkCreateSchema, request.body);
    const record = await store.createShareLink({
      documentId: input.documentId,
      title: input.title,
      expiresAt: input.expiresAt,
      passwordHash: input.password ? hashShareLinkPassword(input.password) : undefined,
    });
    return {
      ...record,
      url: `${config.publicAppUrl.replace(/\/$/, '')}/share/${record.token}`,
    };
  });

  app.get('/v1/share-links', async () => {
    const shareLinks = await store.listShareLinks(200);
    return {
      shareLinks: shareLinks.map((record) => ({
        ...record,
        expired: Date.parse(record.expiresAt) <= Date.now(),
        url: `${config.publicAppUrl.replace(/\/$/, '')}/share/${record.token}`,
      })),
    };
  });

  app.get('/v1/share-links/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const { password } = request.query as { password?: string };
    const record = await store.getShareLink(token);
    if (!record) return reply.code(404).send({ error: 'Share link not found' });
    if (Date.parse(record.expiresAt) <= Date.now()) {
      return reply.code(410).send({ error: 'Share link expired' });
    }
    if (record.passwordHash) {
      if (!password) {
        return reply.code(401).send({ error: 'Password required', passwordRequired: true });
      }
      if (!verifyShareLinkPassword(password, record.passwordHash)) {
        return reply.code(403).send({ error: 'Invalid password' });
      }
    }
    return {
      ...toPublicShareLinkRecord(record),
      url: `${config.publicAppUrl.replace(/\/$/, '')}/share/${record.token}`,
    };
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

  app.get('/v1/analytics/events', async () => {
    const events = await store.getAnalytics(500);
    return { events };
  });

  // Notification broadcast (admin dashboard)
  const notificationLog: Array<{
    id: string; title: string; body: string;
    sentAt: string; recipientCount: number; filter?: unknown;
  }> = [];

  app.post('/v1/notifications/broadcast', async (request, reply) => {
    const { title, body, filter } = request.body as {
      title: string; body: string; filter?: { isPro?: boolean };
    };
    if (!title || !body) {
      return reply.code(400).send({ error: 'title and body required' });
    }
    const { randomUUID } = await import('node:crypto');
    const entry = {
      id: randomUUID(),
      title,
      body,
      sentAt: new Date().toISOString(),
      recipientCount: 0,
      filter: filter ?? null,
    };
    notificationLog.unshift(entry);
    return { ok: true, recipientCount: entry.recipientCount, notificationId: entry.id };
  });

  app.get('/v1/notifications', async () => {
    return { notifications: notificationLog.slice(0, 100) };
  });

  app.post('/v1/auth/register', async (request, reply) => {
    const input = parseBody(userRegisterSchema, request.body);
    try {
      const user = await store.registerUser(input);
      return { ok: true, userId: user.id, createdAt: user.createdAt };
    } catch {
      return reply.code(409).send({ error: 'Email already registered' });
    }
  });

  app.post('/v1/auth/login', async (request, reply) => {
    const input = parseBody(userLoginSchema, request.body);
    const user = await store.getUserByEmail(input.email);
    if (!user) return reply.code(404).send({ error: 'No account found for that email' });
    if (user.passwordHash !== input.passwordHash) {
      return reply.code(401).send({ error: 'Incorrect password' });
    }
    return { ok: true, userId: user.id, fullName: user.fullName, isPro: user.isPro };
  });

  app.get('/v1/admin/users', async () => {
    const users = await store.listUsers(500);
    return {
      users: users.map(u => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        provider: u.provider,
        isPro: u.isPro,
        createdAt: u.createdAt,
      })),
    };
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
