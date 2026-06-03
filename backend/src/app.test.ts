import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app.js';
import type { RuntimeConfig } from './config.js';

let app: FastifyInstance;
let dataDir: string;

const config: RuntimeConfig = {
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 0,
  corsOrigins: ['*'],
  apiKey: 'test-key',
  dataDir: '',
  databaseUrl: null,
  publicAppUrl: 'http://localhost:4000',
  integrations: {
    supabase: false,
    r2: false,
    openai: false,
    postmark: false,
  },
};

before(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'papertrail-backend-'));
  app = await buildApp({ ...config, dataDir });
});

after(async () => {
  await app.close();
  await rm(dataDir, { recursive: true, force: true });
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
