import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import type { RuntimeConfig } from './config.js';
import { documentKey } from './r2.js';

let app: FastifyInstance;
let dataDir: string;

const config: RuntimeConfig = {
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 0,
  corsOrigins: ['*'],
  apiKey: 'test-key',
  adminKey: 'test-admin-key',
  dataDir: '',
  databaseUrl: null,
  publicAppUrl: 'http://localhost:4000',
  inboundEmailDomain: 'mail.filetrail.test',
  integrations: {
    supabase: false,
    r2: false,
    openai: false,
    anthropic: false,
    postmark: false,
  },
};

before(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'filetrail-backend-'));
  app = await buildApp({ ...config, dataDir });
});

after(async () => {
  await app.close();
  await rm(dataDir, { recursive: true, force: true });
});

test('documentKey nests under user email with readable folder names', () => {
  assert.equal(
    documentKey(
      'doc-1',
      'application/pdf',
      'Car Insurance 2026',
      'User@Example.com',
      'insurance',
      'Nicholas Rushing',
    ),
    'user@example.com/insurance/Nicholas Rushing/Car Insurance 2026.pdf',
  );
});

test('documentKey strips unsafe characters from title and email', () => {
  assert.equal(
    documentKey(
      'doc-1',
      'image/jpeg',
      'Re/ce*ipt: #42',
      'jo hn@example.com',
      'Medical Records',
      'Ni/ck *Rushing',
    ),
    'jo_hn@example.com/medical_records/Ni_ck _Rushing/Re_ce_ipt_ _42.jpeg',
  );
});

test('documentKey falls back to legacy path without an email', () => {
  assert.equal(
    documentKey('doc-1', 'application/pdf', 'Lease'),
    'documents/doc-1/Lease.pdf',
  );
});

test('health endpoint is public', async () => {
  const res = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().ok, true);
});

test('v1 endpoints require API key when configured', async () => {
  const res = await app.inject({ method: 'GET', url: '/v1/config' });
  assert.equal(res.statusCode, 401);
});

test('auth login verifies the stored password after reinstall', async () => {
  const auth = { Authorization: 'Bearer test-key' };
  const password = 'correct horse battery staple';
  const passwordHash = createHash('sha256').update(password).digest('hex');

  const register = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    headers: auth,
    payload: {
      id: 'user-reconnect-1',
      fullName: 'Reconnect User',
      email: 'reconnect@example.com',
      passwordHash,
      provider: 'email',
    },
  });
  assert.equal(register.statusCode, 200);

  const login = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    headers: auth,
    payload: {
      email: 'reconnect@example.com',
      password,
    },
  });

  assert.equal(login.statusCode, 200);
  assert.equal(login.json().email, 'reconnect@example.com');
  assert.ok(login.json().storageAccessToken);
});

test('sync push and pull stores metadata', async () => {
  const auth = { Authorization: 'Bearer test-key' };
  const now = new Date().toISOString();

  const push = await app.inject({
    method: 'POST',
    url: '/v1/sync/push',
    headers: auth,
    payload: {
      deviceId: 'device-1',
      folders: [{ id: 'folder-1', name: 'Tax', color: '#F59E0B', createdAt: now, updatedAt: now }],
      documents: [{
        id: 'doc-1',
        title: 'Receipt',
        category: 'receipt',
        fileUri: 'file:///local/doc-1.jpg',
        thumbnailUri: null,
        mimeType: 'image/jpeg',
        fileSizeBytes: 123,
        pageCount: 1,
        ocrStatus: 'done',
        isFavorite: false,
        folderId: 'folder-1',
        tags: ['tax'],
        createdAt: now,
        updatedAt: now,
      }],
    },
  });

  assert.equal(push.statusCode, 200);
  assert.equal(push.json().ok, true);

  const pull = await app.inject({
    method: 'POST',
    url: '/v1/sync/pull',
    headers: auth,
    payload: { deviceId: 'device-1', sinceVersion: 0 },
  });

  assert.equal(pull.statusCode, 200);
  assert.equal(pull.json().documents.length, 1);
  assert.equal(pull.json().folders.length, 1);
});

test('AI suggestion endpoint returns heuristic result', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/ai/suggest-document',
    headers: { Authorization: 'Bearer test-key' },
    payload: { ocrText: 'Store Receipt\nTOTAL $12.99' },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().category, 'receipt');
});

test('AI suggestion endpoint uses filename when OCR text is missing', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/ai/suggest-document',
    headers: { Authorization: 'Bearer test-key' },
    payload: { filename: 'Acme-Warranty.pdf', mimeType: 'application/pdf' },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().category, 'warranty');
  assert.equal(res.json().suggestedTitle, 'Acme Warranty');
  assert.ok(res.json().tags.includes('warranty'));
});

test('AI suggestion endpoint extracts a person subfolder for birth certificates', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/ai/suggest-document',
    headers: { Authorization: 'Bearer test-key' },
    payload: {
      title: 'Birth Certificate',
      ocrText: 'CERTIFICATE OF LIVE BIRTH\nNAME OF CHILD\nJACOB ELI RUSHING\nDATE OF BIRTH\n2024-02-10',
      mimeType: 'application/pdf',
    },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().category, 'id');
  assert.equal(res.json().suggestedFolderName, 'IDs');
  assert.equal(res.json().suggestedSubfolderName, 'Jacob Eli Rushing');
  assert.equal(res.json().suggestedTitle, 'Birth Certificate - Jacob Eli Rushing');
  assert.equal(res.json().facts.personName, 'Jacob Eli Rushing');
  assert.equal(res.json().facts.issueDate, '2024-02-10');
});

test('AI suggestion endpoint handles lowercase person names in OCR text', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/ai/suggest-document',
    headers: { Authorization: 'Bearer test-key' },
    payload: {
      title: 'Driver License',
      ocrText: 'name\nnick a rushing\ndob 2026-06-01',
      mimeType: 'image/jpeg',
    },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().category, 'id');
  assert.equal(res.json().suggestedSubfolderName, 'Nick A Rushing');
  assert.equal(res.json().suggestedTitle, 'Driver License - Nick A Rushing');
  assert.equal(res.json().facts.personName, 'Nick A Rushing');
});

test('email config endpoint returns forwarding alias', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/v1/email/config?email=nick@example.com',
    headers: { Authorization: 'Bearer test-key' },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().forwardingAddress, 'filetrail+nick.example.com@mail.filetrail.test');
  assert.equal(res.json().inboundEnabled, true);
});

test('email inbound records can be listed', async () => {
  const auth = { Authorization: 'Bearer test-key' };
  const inbound = await app.inject({
    method: 'POST',
    url: '/v1/email/inbound',
    headers: auth,
    payload: {
      sender: 'billing@example.com',
      subject: 'June statement',
      attachments: [{ filename: 'statement.pdf', mimeType: 'application/pdf', sizeBytes: 1200 }],
    },
  });
  assert.equal(inbound.statusCode, 200);

  const list = await app.inject({
    method: 'GET',
    url: '/v1/email/inbound?limit=5',
    headers: auth,
  });
  assert.equal(list.statusCode, 200);
  assert.ok(list.json().emails.length >= 1);
});

test('share links enforce passwords and list created links', async () => {
  const auth = { Authorization: 'Bearer test-key' };
  const expiresAt = new Date(Date.now() + 3600_000).toISOString();

  const create = await app.inject({
    method: 'POST',
    url: '/v1/share-links',
    headers: auth,
    payload: {
      documentId: 'doc-1',
      title: 'Tax return',
      expiresAt,
      password: 'supersecret',
    },
  });

  assert.equal(create.statusCode, 200);
  assert.equal(create.json().passwordProtected, true);

  const token = create.json().token as string;

  const missingPassword = await app.inject({
    method: 'GET',
    url: `/v1/share-links/${token}`,
    headers: auth,
  });
  assert.equal(missingPassword.statusCode, 401);

  const wrongPassword = await app.inject({
    method: 'GET',
    url: `/v1/share-links/${token}?password=wrongpass`,
    headers: auth,
  });
  assert.equal(wrongPassword.statusCode, 403);

  const ok = await app.inject({
    method: 'GET',
    url: `/v1/share-links/${token}?password=supersecret`,
    headers: auth,
  });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().token, token);

  const list = await app.inject({
    method: 'GET',
    url: '/v1/share-links',
    headers: auth,
  });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().shareLinks.length, 1);
  assert.equal(list.json().shareLinks[0].token, token);
});
