import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { JsonStore } from '../filetrail/store.js';
import { hashShareLinkPassword, verifyShareLinkPassword } from '../filetrail/shareLinks.js';
import {
  syncPullSchema, syncPushSchema, shareLinkCreateSchema,
  emailInboundSchema, analyticsBatchSchema,
  userRegisterSchema, userLoginSchema, notificationBroadcastSchema,
} from '../filetrail/schemas.js';

const DATA_DIR = process.env.DATA_DIR ?? './data';
export const store = new JsonStore(DATA_DIR);

const router = Router();

const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return next();
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${apiKey}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'filetrail', time: new Date().toISOString(), integrations: { openai: Boolean(process.env.OPENAI_API_KEY) } });
});

router.get('/config', (_req, res) => {
  res.json({
    apiVersion: 1,
    features: { aiSuggest: false, cloudSync: true, emailIngest: true, pushNotifications: true },
    integrations: { openai: Boolean(process.env.OPENAI_API_KEY), stripe: Boolean(process.env.STRIPE_SECRET_KEY) },
  });
});

router.post('/sync/push', requireApiKey, async (req, res) => {
  const body = syncPushSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.format() }); return; }
  const result = await store.push(body.data);
  res.json(result);
});

router.post('/sync/pull', requireApiKey, async (req, res) => {
  const body = syncPullSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.format() }); return; }
  const result = await store.pull(body.data.sinceVersion);
  res.json(result);
});

router.post('/share-links', requireApiKey, async (req, res) => {
  const body = shareLinkCreateSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.format() }); return; }
  const passwordHash = body.data.password ? hashShareLinkPassword(body.data.password) : undefined;
  const record = await store.createShareLink({ ...body.data, passwordHash });
  const baseUrl = process.env.PUBLIC_URL ?? `${req.protocol}://${req.get('host')}`;
  res.status(201).json({ ...record, url: `${baseUrl}/share/${record.token}` });
});

router.get('/share-links', async (req, res) => {
  const links = await store.listShareLinks();
  const baseUrl = process.env.PUBLIC_URL ?? `${req.protocol}://${req.get('host')}`;
  const decorated = links.map(l => ({
    ...l,
    url: `${baseUrl}/share/${l.token}`,
    expired: new Date(l.expiresAt) < new Date(),
  }));
  res.json({ shareLinks: decorated });
});

router.get('/share-links/:token', async (req, res) => {
  const { token } = req.params;
  const record = await store.getShareLink(token);
  if (!record) { res.status(404).json({ error: 'Share link not found' }); return; }
  const expired = new Date(record.expiresAt) < new Date();
  if (expired) { res.status(410).json({ error: 'Share link has expired' }); return; }
  if (record.passwordProtected) {
    const provided = (req.query.password as string) ?? req.body?.password;
    if (!provided || !verifyShareLinkPassword(provided, record.passwordHash)) {
      res.status(401).json({ error: 'Password required or incorrect' });
      return;
    }
  }
  const baseUrl = process.env.PUBLIC_URL ?? `${req.protocol}://${req.get('host')}`;
  const { passwordHash: _ph, ...pub } = record;
  res.json({ ...pub, url: `${baseUrl}/share/${pub.token}` });
});

router.post('/email/inbound', async (req, res) => {
  const body = emailInboundSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.format() }); return; }
  const record = await store.addInboundEmail(body.data);
  res.status(201).json(record);
});

router.get('/analytics/events', async (_req, res) => {
  const events = await store.getAnalytics();
  res.json({ events });
});

router.post('/analytics/events', async (req, res) => {
  const body = analyticsBatchSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.format() }); return; }
  const count = await store.addAnalytics(body.data.events);
  res.status(201).json({ ok: true, count });
});

router.post('/users/register', requireApiKey, async (req, res) => {
  const body = userRegisterSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.format() }); return; }
  const user = await store.registerUser(body.data);
  const { passwordHash: _ph, ...pub } = user;
  res.status(201).json(pub);
});

router.post('/users/login', requireApiKey, async (req, res) => {
  const body = userLoginSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.format() }); return; }
  const user = await store.getUserByEmail(body.data.email);
  if (!user || user.passwordHash !== body.data.passwordHash) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const { passwordHash: _ph, ...pub } = user;
  res.json(pub);
});

router.get('/admin/users', async (_req, res) => {
  const users = await store.listUsers();
  const pub = users.map(({ passwordHash: _ph, ...u }) => u);
  res.json({ users: pub });
});

router.get('/notifications', async (_req, res) => {
  const notifications = await store.listNotifications();
  res.json({ notifications });
});

router.post('/notifications/broadcast', async (req, res) => {
  const body = notificationBroadcastSchema.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: body.error.format() }); return; }
  const users = await store.listUsers();
  const recipients = body.data.filter?.isPro !== undefined
    ? users.filter(u => u.isPro === body.data.filter!.isPro)
    : users;
  const record = await store.addNotification({
    title: body.data.title, body: body.data.body,
    filter: body.data.filter, recipientCount: recipients.length,
  });
  res.json({ ok: true, recipientCount: recipients.length, notificationId: record.id });
});

export default router;
