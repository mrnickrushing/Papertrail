# FileTrail

FileTrail is a local-first document vault with an Autopilot layer on top.

The vault handles:
- capture
- OCR
- folders and tags
- search
- local storage
- encrypted cloud sync

Autopilot handles:
- extracting structured facts from documents
- grouping records by person
- surfacing due dates and expirations
- flagging documents that still need review
- powering email-to-vault intake

## Product shape

FileTrail is not just a scanner app and not generic cloud storage.

The intended model is:
- `Vault`: store and organize documents
- `Search`: find anything fast
- `Viewer`: inspect and edit metadata
- `Autopilot`: deadlines, renewals, missing docs, and suggested next actions

## Monorepo layout

- `mobile/` — Expo React Native app
- `backend/` — Fastify API for sync, AI, storage, sharing, and inbound email
- `web/marketing/` — public marketing site
- `web/admin/` — admin dashboard
- `docs/` — feature and product notes

## Current Autopilot foundation

The current implementation adds the base layer needed to evolve FileTrail into a life-admin product:

- structured document facts:
  - person name
  - issuer
  - document type
  - issue date
  - expiration date
  - due date
  - policy/account/member numbers
  - amount due
- Autopilot tab in mobile
- email forwarding config and inbound email visibility
- AI extraction contract updated to return facts, not just title/category

This is the correct first step because it moves FileTrail from passive storage to actionable storage.

## Local development

### Mobile

```bash
cd mobile
npm install
npm run typecheck
npm run lint
npm start
```

### Backend

```bash
cd backend
npm install
npm run test:build
npm run dev
```

### Marketing site

```bash
cd web/marketing
npm install
npm run build
```

## Backend environment

Common environment variables:

- `API_KEY`
- `ADMIN_KEY`
- `PUBLIC_APP_URL`
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET`
- `INBOUND_EMAIL_DOMAIN`

`INBOUND_EMAIL_DOMAIN` enables the generated forwarding address returned by `/v1/email/config`.

## Direction

The product direction for FileTrail is:

`documents -> extracted facts -> reminders -> actions`

That is the wedge with the most leverage. It keeps the app concrete, useful, and expandable without turning it into a vague assistant product.
