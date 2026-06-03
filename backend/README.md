# PaperTrail Backend

Fastify API for PaperTrail Pro features.

The backend is Railway-ready. It uses Postgres when `DATABASE_URL` is present and falls back to local JSON persistence for development.

## Commands

```bash
npm install
npm run migrate:dev
npm run dev
npm run typecheck
npm run test:build
```

## Railway

1. Create a Railway project.
2. Add a Postgres service.
3. Add this repo as a service rooted at `backend/`.
4. Set `API_KEY` and `PUBLIC_APP_URL`.
5. Railway should inject `DATABASE_URL`.
6. Deploy. Railway builds the TypeScript app, then the start command runs compiled migrations before booting the server.

## API

- `GET /health` - service health and integration status
- `GET /v1/config` - mobile feature flags and backend capability status
- `POST /v1/sync/pull` - pull metadata changes for a device
- `POST /v1/sync/push` - push local document/folder metadata changes
- `POST /v1/ai/suggest-document` - suggest title/category/tags from OCR text
- `POST /v1/share-links` - create a secure share-link record
- `GET /v1/share-links/:token` - inspect a share-link record
- `POST /v1/email/inbound` - receive inbound email-to-vault metadata
- `POST /v1/analytics/events` - ingest client analytics events

If `API_KEY` is set, all `/v1/*` routes require `Authorization: Bearer <API_KEY>`.
