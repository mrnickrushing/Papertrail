# FileTrail 🗂️

> Your documents, your device. Upgrade when you're ready.

FileTrail is a **local-first digital filing cabinet** for iOS and Android. Capture, organize, and retrieve any document instantly — receipts, contracts, IDs, warranties, tax docs, medical records — stored privately on your device by default. No account required.

---

## Philosophy

**Free feels generous.** FileTrail is fully functional offline with no account required. Your documents never leave your device unless you choose to sync. Upgrade to Pro for cloud sync, AI organization, and sharing.

> *“FileTrail is free if you store documents on your own device. Upgrade when you want smart cloud sync, AI organization, and sharing.”*

---

## Features

### Free (Local-First)
- 📄 Unlimited local documents
- 📁 Custom folders + tags
- 🔍 On-device OCR (Apple Vision / ML Kit) — *Phase 2*
- 🔎 Full-text search — filenames + OCR text
- 📤 Export as ZIP or share any document — *Phase 4*
- 🔒 Biometric lock (Face ID / Touch ID) — *Phase 8*
- 💬 Comments on any document — *Phase 3*
- 📴 No account required — fully offline

### Pro (~$4.99–6.99/mo or $39.99/yr)
- ☁️ Encrypted cloud sync + multi-device
- 📧 Email-to-vault (`@filetrail.app` forwarding)
- 🤖 AI auto-naming
- 🗾️ AI auto-categorization
- ⏰ Expiry detection (IDs, warranties, insurance)
- 👥 Shared vaults (family / business)
- 🔗 Secure sharing (time-limited, password-protected)
- 🧧 Accountant export (one-tap tagged doc export)
- 🗣️ Natural-language search (“find my car insurance from last year”)
- 💰 Spending analytics (by vendor, category, month)
- 🏥 Document health score (enhanced, cross-device)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo ~52) |
| Navigation | Expo Router v4 |
| Local DB | Expo SQLite (WAL + FTS5) |
| State | Zustand v5 |
| On-device OCR | Apple Vision (iOS) / ML Kit (Android) |
| Cloud Storage | Cloudflare R2 (Pro) |
| Auth | Supabase (Pro) |
| AI Features | OpenAI / Claude API (Pro) |
| Backend | Node.js / Fastify (Pro features) |

---

## Project Structure

```
filetrail/
├── mobile/                    # React Native (Expo) app
│   ├── app/                   # Expo Router screens
│   │   ├── _layout.tsx        # Root layout (DB init, splash)
│   │   ├── (tabs)/            # Bottom tab navigator
│   │   │   ├── index.tsx      # Vault (document list)
│   │   │   ├── folders.tsx    # Folder management
│   │   │   ├── search.tsx     # Full-text search
│   │   │   └── settings.tsx   # App settings + Pro upsell
│   │   ├── viewer/[id].tsx    # Full document viewer (image + PDF)
│   │   └── folder/[id].tsx    # Folder detail
│   ├── components/            # Reusable UI components
│   │   ├── DocumentCard.tsx   # List card with category strip
│   │   ├── CategoryBadge.tsx  # Pill badge for doc types
│   │   ├── EmptyState.tsx     # Empty list placeholder
│   │   ├── FAB.tsx            # Floating action button
│   │   └── TabIcon.tsx        # Bottom tab icons
│   ├── services/
│   │   ├── db.ts              # SQLite service (CRUD + FTS5 search)
│   │   └── exportService.ts   # Share and ZIP export
│   ├── store/
│   │   ├── documentStore.ts   # Zustand — documents, folders, tags
│   │   └── settingsStore.ts   # Zustand — app settings
│   ├── theme/
│   │   └── tokens.ts          # Colors, typography, spacing, radius
│   ├── types/
│   │   └── document.ts        # TypeScript types for all entities
│   └── utils/
│       └── format.ts          # File size, date helpers
├── backend/                   # Pro-tier API (Node/Fastify) — Phase 6+
└── docs/                      # Architecture & planning docs
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- iOS Simulator (Xcode) or Android Emulator (Android Studio), or the [Expo Go](https://expo.dev/client) app

### Install & Run

```bash
# Clone the repo
git clone https://github.com/mrnickrushing/Filetrail.git
cd Filetrail/mobile

# Install dependencies
npm install

# Start the dev server
npx expo start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go.

> **Note:** Some Phase 4+ features (native PDF viewing, real OCR) require a **development build** rather than Expo Go. See the [Development Builds](#development-builds-phase-4) section below.

### Development Builds (Phase 4+)

Phase 4 introduces `react-native-pdf` and `react-native-blob-util`, which contain native code and cannot run in Expo Go. You need an EAS development build or a local bare build.

#### Option A — EAS cloud build (recommended)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in
eas login

# Build a dev client for iOS simulator
cd Filetrail
eas build --profile development --platform ios

# Build a dev client APK for Android
eas build --profile development --platform android
```

Install the resulting `.app` / `.apk` on your device or simulator, then start the Metro bundler:

```bash
cd mobile
npx expo start --dev-client
```

#### Option B — Local bare workflow

```bash
cd mobile
npx expo prebuild           # generates ios/ and android/ directories
cd ios && pod install && cd ..
npx expo run:ios            # or npx expo run:android
```

#### Feature availability matrix

| Feature | Expo Go | Dev Build |
|---|---|---|
| Capture, folders, search | ✅ | ✅ |
| Image crop (gesture) | ✅ | ✅ |
| ZIP export | ✅ | ✅ |
| On-device OCR | ❌ stub | ✅ |
| Native PDF viewer | ❌ notice shown | ✅ |

### Environment Variables (Pro features only)

```bash
cp .env.example .env
# Fill in Supabase + API keys for Pro cloud features
```

The free local-first tier works with zero environment variables.

---

## Database

FileTrail uses **Expo SQLite** with WAL mode and FTS5 full-text search. The schema is initialized automatically on first launch via `services/db.ts`.

| Table | Purpose |
|---|---|
| `documents` | All document metadata + OCR text |
| `documents_fts` | FTS5 virtual table for full-text search |
| `folders` | Folder tree |
| `tags` | Tag library |
| `document_tags` | Many-to-many join |
| `document_comments` | Per-document comments |

All queries use parameterized statements. No raw string interpolation.

---

## Development Phases

See [`docs/roadmap.md`](docs/roadmap.md) for the original planning document (written after Phase 3).

| Phase | Status | Scope |
|---|---|---|
| 1 — Foundation | ✅ Done | Project setup, navigation, theme, local DB |
| 2 — Capture | ✅ Done | Camera scan, photo import, PDF upload, OCR stubs |
| 3 — Organize | ✅ Done | Folders, tags, search, document viewer |
| 4 — Viewer · Crop · Export | ✅ Done | Native PDF viewer, gesture crop, ZIP export, EAS dev builds |
| 5 — Organization & Bulk | ✅ Done | Multi-select, bulk move/delete, tag editor, filter chips |
| 6 — OCR & Search | ✅ Done | OCR retry, metadata extraction, smarter search |
| 7 — Backup & Sync | ✅ Done | Encrypted backup, restore, cloud sync architecture |
| 8 — Security | ✅ Done | Biometric lock, redaction, privacy hardening |
| 9 — Polish | ✅ Done | Performance, accessibility, skeleton loaders |
| 10 — Launch | ✅ Done | Onboarding, store assets, analytics |

---

## What's Built (v1.0.0)

All 10 phases are complete. Here's the full feature inventory:

| Feature | Where |
|---|---|
| Document capture (camera, photo, PDF import) | `app/capture/` |
| Native PDF viewer with zoom + page nav | `app/viewer/[id].tsx` |
| Gesture crop with draggable corner handles | `components/capture/ImageCropper.tsx` |
| Full-text search with snippet highlighting | `app/(tabs)/search.tsx` |
| Search history + suggestions | `services/searchHistory.ts` |
| Folders, tags, categories | `store/documentStore.ts` |
| Multi-select + bulk move / tag / delete | `app/(tabs)/index.tsx`, `components/BulkActionBar.tsx` |
| Tag editor with autocomplete | `components/TagEditor.tsx` |
| Filter chips: category, favorites, tags | `app/(tabs)/index.tsx` |
| ZIP export | `services/exportService.ts` |
| Local backup (.ptbak) + restore | `services/backupService.ts` |
| OCR background queue + retry | `services/ocrQueue.ts` |
| OCR metadata extraction (dates, amounts, vendor) | `services/ocr.ts` |
| Biometric lock (Face ID / Touch ID) | `services/biometricService.ts`, `components/LockScreen.tsx` |
| Lock-on-background via AppState | `app/_layout.tsx` |
| Skeleton loaders | `components/SkeletonLoader.tsx` |
| Accessibility (VoiceOver / TalkBack) | `components/DocumentCard.tsx` |
| Onboarding walkthrough | `app/onboarding.tsx` |
| Analytics stub (no-op, ready for provider) | `services/analytics.ts` |
| EAS dev builds (iOS simulator + Android APK) | `eas.json`, `app.json` |

---

## Contributing

All feature work happens on `phase/*` branches. PRs merge into `main` at the end of each phase.

---

## License

MIT
