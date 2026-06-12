import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { randomUUID } from 'node:crypto';
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
import { hashPassword, verifyPassword } from './hashUtils.js';
import {
  r2ConfigFromEnv,
  createR2Client,
  getUploadUrl,
  getDownloadUrl,
  documentKey,
  objectExists,
} from './r2.js';

function parseBody<T>(schema: { parse: (value: unknown) => T }, body: unknown): T {
  return schema.parse(body);
}

export async function buildApp(config: RuntimeConfig, store: FiletrailStore = new JsonStore(config.dataDir)): Promise<FastifyInstance> {
  await store.init();

  function emailSlug(email: string): string {
    return email
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 48);
  }

  async function authorizeStorageUser(request: {
    headers: Record<string, string | undefined> | { [key: string]: unknown };
  }): Promise<Awaited<ReturnType<FiletrailStore['getUserById']>>> {
    const userId = typeof request.headers['x-filetrail-user-id'] === 'string'
      ? request.headers['x-filetrail-user-id']
      : undefined;
    const storageToken = typeof request.headers['x-filetrail-storage-token'] === 'string'
      ? request.headers['x-filetrail-storage-token']
      : undefined;

    if (!userId || !storageToken) {
      return null;
    }

    const user = await store.getUserById(userId);
    if (!user || !user.storageAccessToken || user.storageAccessToken !== storageToken) {
      return null;
    }

    return user;
  }

  const app = Fastify({
    logger: config.nodeEnv !== 'test',
    bodyLimit: 10 * 1024 * 1024,
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
  });

  app.addHook('preHandler', async (request, reply) => {
    // Admin routes have their own ADMIN_KEY hook — skip them here
    if (!request.url.startsWith('/v1/') || request.url.startsWith('/v1/admin/') || !config.apiKey) return;
    const auth = request.headers.authorization;
    if (auth !== `Bearer ${config.apiKey}`) {
      await reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/v1/admin/') || !config.adminKey) return;
    const auth = request.headers.authorization;
    if (auth !== `Bearer ${config.adminKey}`) {
      await reply.code(401).send({ error: 'Admin access denied' });
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

  app.get('/v1/email/inbound', async (request) => {
    const { limit } = request.query as { limit?: string };
    const emails = await store.listInboundEmails(limit ? Math.max(1, Math.min(200, Number(limit) || 100)) : 100);
    return { emails };
  });

  app.get('/v1/email/config', async (request) => {
    const { email } = request.query as { email?: string };
    const forwardingAddress = config.inboundEmailDomain && email
      ? `filetrail+${emailSlug(email)}@${config.inboundEmailDomain}`
      : null;
    return {
      forwardingAddress,
      inboundEnabled: Boolean(config.inboundEmailDomain),
      domain: config.inboundEmailDomain,
      instructions: forwardingAddress
        ? [
            'Forward bills, statements, insurance emails, and school paperwork to this address.',
            'Attachments should arrive in the Autopilot email feed after your inbound provider posts them here.',
          ]
        : [
            'Set INBOUND_EMAIL_DOMAIN on the backend to generate a forwarding address for each account.',
          ],
    };
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
      const user = await store.registerUser({
        ...input,
        storageAccessToken: randomUUID().replace(/-/g, ''),
      });
      return {
        ok: true,
        userId: user.id,
        storageAccessToken: user.storageAccessToken,
        fullName: user.fullName,
        email: user.email,
        provider: user.provider,
        appleUserId: user.appleUserId,
        createdAt: user.createdAt,
      };
    } catch {
      return reply.code(409).send({ error: 'Email already registered' });
    }
  });

  app.post('/v1/auth/login', async (request, reply) => {
    const input = parseBody(userLoginSchema, request.body);
    const user = await store.getUserByEmail(input.email);
    if (!user) return reply.code(404).send({ error: 'No account found for that email' });
    const suppliedPassword = input.password ?? input.passwordHash;
    if (!suppliedPassword) {
      return reply.code(400).send({ error: 'password is required' });
    }
    const { ok, needsRehash } = await verifyPassword(suppliedPassword, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: 'Incorrect password' });
    }
    if (needsRehash) {
      const upgraded = await hashPassword(suppliedPassword);
      await store.updateUser(user.id, { passwordHash: upgraded });
    }
    let storageAccessToken = user.storageAccessToken;
    if (!storageAccessToken) {
      storageAccessToken = randomUUID().replace(/-/g, '');
      const updated = await store.updateUser(user.id, { storageAccessToken });
      if (!updated) return reply.code(500).send({ error: 'Could not initialize storage access' });
    }
    return {
      ok: true,
      userId: user.id,
      storageAccessToken,
      fullName: user.fullName,
      email: user.email,
      provider: user.provider,
      appleUserId: user.appleUserId,
      isPro: user.isPro,
      createdAt: user.createdAt,
    };
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

  // ── Cloud file storage (R2, Pro-users only) ──────────────────────────────
  const r2Config = r2ConfigFromEnv();
  const r2Client = r2Config ? createR2Client(r2Config) : null;

  /**
   * POST /v1/storage/upload-url
   * Body: { documentId: string; mimeType: string; fileName?: string; userEmail?: string; category?: string; ownerName?: string }
   * Returns a presigned PUT URL the mobile client uses to upload directly to R2.
   * When userEmail is provided, objects are stored under
   * {email}/{category}/{owner-name}/{title}.{ext}; otherwise the legacy documents/{id}/ path.
   * Pro gate is enforced on the mobile side (RevenueCat). Backend just needs
   * a valid API key (checked by preHandler when API_KEY env var is set).
   */
  app.post('/v1/storage/upload-url', async (request, reply) => {
    if (!r2Client || !r2Config) {
      return reply.code(503).send({ error: 'File storage not configured' });
    }
    const user = await authorizeStorageUser(request);
    if (!user) {
      return reply.code(401).send({ error: 'Storage access denied' });
    }

    const { documentId, mimeType, fileName, category, ownerName } = request.body as {
      documentId?: string;
      mimeType?: string;
      fileName?: string;
      category?: string;
      ownerName?: string;
    };
    if (!documentId || !mimeType) {
      return reply.code(400).send({ error: 'documentId and mimeType are required' });
    }

    const key = documentKey(documentId, mimeType, fileName, user.email, category, ownerName);
    const uploadUrl = await getUploadUrl(r2Client, r2Config.bucket, key, mimeType);
    // storageUrl is the stable key path — used as a reference, not a public URL.
    // Files are always accessed via fresh presigned GET URLs.
    const storageUrl = `r2://${r2Config.bucket}/${key}`;

    return { uploadUrl, storageUrl, key };
  });

  /**
   * GET /v1/storage/download-url/:documentId?mimeType=...
   * Returns a presigned GET URL valid for 1 hour.
   */
  app.get('/v1/storage/download-url/:documentId', async (request, reply) => {
    if (!r2Client || !r2Config) {
      return reply.code(503).send({ error: 'File storage not configured' });
    }
    const user = await authorizeStorageUser(request);
    if (!user) {
      return reply.code(401).send({ error: 'Storage access denied' });
    }
    const { documentId } = request.params as { documentId: string };
    const { mimeType, storageKey, fileName, category, ownerName } = request.query as {
      mimeType?: string;
      storageKey?: string;
      fileName?: string;
      category?: string;
      ownerName?: string;
    };

    let key: string;
    if (storageKey) {
      // Preferred: client passes the exact key stored in document.storageUrl
      if (!storageKey.startsWith(`${user.email.toLowerCase()}/`) && !storageKey.startsWith(`documents/${documentId}/`)) {
        return reply.code(403).send({ error: 'Storage key does not belong to this account' });
      }
      key = storageKey;
    } else if (mimeType) {
      // Fallback: reconstruct key (works when fileName is also provided)
      key = documentKey(documentId, mimeType, fileName, user.email, category, ownerName);
    } else {
      return reply.code(400).send({ error: 'storageKey or mimeType is required' });
    }

    const downloadUrl = await getDownloadUrl(r2Client, r2Config.bucket, key);
    return { downloadUrl };
  });

  /**
   * POST /v1/storage/exists
   * Body: { items: Array<{ documentId: string; storageKey?: string; mimeType?: string; fileName?: string; userEmail?: string; category?: string; ownerName?: string }> }
   * Returns per-document existence so clients can repair stale storageUrl metadata.
   */
  app.post('/v1/storage/exists', async (request, reply) => {
    if (!r2Client || !r2Config) {
      return reply.code(503).send({ error: 'File storage not configured' });
    }
    const user = await authorizeStorageUser(request);
    if (!user) {
      return reply.code(401).send({ error: 'Storage access denied' });
    }

    const { items } = request.body as {
      items?: Array<{
        documentId?: string;
        storageKey?: string;
        mimeType?: string;
        fileName?: string;
        category?: string;
        ownerName?: string;
      }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return reply.code(400).send({ error: 'items are required' });
    }

    const results = await Promise.all(items.map(async (item) => {
      if (!item.documentId) {
        return { documentId: '', exists: false, error: 'documentId is required' };
      }

      let key = item.storageKey;
      if (!key) {
        if (!item.mimeType) {
          return {
            documentId: item.documentId,
            exists: false,
            error: 'storageKey or mimeType is required',
          };
        }
        key = documentKey(
          item.documentId,
          item.mimeType,
          item.fileName,
          user.email,
          item.category,
          item.ownerName,
        );
      }
      if (key && !key.startsWith(`${user.email.toLowerCase()}/`) && !key.startsWith(`documents/${item.documentId}/`)) {
        return { documentId: item.documentId, exists: false, error: 'Storage key does not belong to this account' };
      }

      const exists = await objectExists(r2Client, r2Config.bucket, key);
      return { documentId: item.documentId, exists, storageKey: key };
    }));

    return { results };
  });

  /**
   * GET /v1/users/pro-status?email=...
   * Returns whether a registered user has Pro. No auth required — low-sensitivity
   * lookup used by the mobile app to sync Pro status from the admin panel.
   */
  app.get('/v1/users/pro-status', async (request, reply) => {
    const { email } = request.query as { email?: string };
    if (!email) return reply.code(400).send({ error: 'email is required' });
    const user = await store.getUserByEmail(email.toLowerCase().trim());
    if (!user) return { found: false, isPro: false };
    return { found: true, isPro: user.isPro };
  });

  app.get('/v1/admin/stats', async () => store.adminStats());

  app.get('/v1/admin/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await store.getUserById(id);
    if (!user) return reply.code(404).send({ error: 'User not found' });
    const { passwordHash: _ph, ...safe } = user;
    return { user: safe };
  });

  app.patch('/v1/admin/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const patch = request.body as { isPro?: boolean; fullName?: string; email?: string };
    const user = await store.updateUser(id, patch);
    if (!user) return reply.code(404).send({ error: 'User not found' });
    const { passwordHash: _ph, ...safe } = user;
    return { ok: true, user: safe };
  });

  app.delete('/v1/admin/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await store.getUserById(id);
    if (!existing) return reply.code(404).send({ error: 'User not found' });
    await store.deleteUser(id);
    return { ok: true };
  });

  app.delete('/v1/admin/share-links/:token', async (request, reply) => {
    const { token } = request.params as { token: string };
    const link = await store.getShareLink(token);
    if (!link) return reply.code(404).send({ error: 'Share link not found' });
    await store.deleteShareLink(token);
    return { ok: true };
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
