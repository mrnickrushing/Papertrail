# PaperTrail 🗂️

> Your documents, your device. Upgrade when you're ready.

PaperTrail is a **local-first digital filing cabinet** for iOS and Android. Capture, organize, and retrieve any document instantly — receipts, contracts, IDs, warranties, tax docs, medical records — stored privately on your device by default.

---

## Philosophy

**Free feels generous.** PaperTrail is fully functional offline with no account required. Your documents never leave your device unless you choose to sync. Upgrade to Pro for cloud sync, AI organization, and sharing.

> *"PaperTrail is free if you store documents on your own device. Upgrade when you want smart cloud sync, AI organization, and sharing."*

---

## Features

### Free (Local-First)
- 📄 Unlimited local documents
- 📁 Custom folders + tags
- 🔍 On-device OCR (Apple Vision / ML Kit)
- 🔎 Basic search — filename + OCR text
- 🔔 Manual reminders
- 🔒 Biometric lock (Face ID / Touch ID)
- 📤 Export anytime (PDF, ZIP, share sheet)
- 💬 Comments on any document
- 🏥 Document health score (local)
- 📴 No account required — fully offline

### Pro (~$4.99–6.99/mo or $39.99/yr)
- ☁️ Encrypted cloud sync + multi-device
- 📧 Email-to-vault (`@papertrail.app` forwarding)
- 🤖 AI auto-naming
- 🗂️ AI auto-categorization
- ⏰ Expiry detection (IDs, warranties, insurance)
- 👥 Shared vaults (family / business)
- 🔗 Secure sharing (time-limited, password-protected)
- 🧾 Accountant export (one-tap tagged doc export)
- 🗣️ Natural-language search ("find my car insurance from last year")
- 💰 Spending analytics (by vendor, category, month)
- 🏥 Document health score (enhanced, cross-device)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo) |
| Local DB | Expo SQLite + WatermelonDB |
| On-device OCR | Apple Vision (iOS) / ML Kit (Android) |
| Navigation | Expo Router |
| State | Zustand |
| Cloud Storage | Cloudflare R2 (Pro) |
| Auth | Supabase (Pro) |
| AI Features | OpenAI / Claude API (Pro) |
| Backend | Node.js / Fastify (Pro features) |

---

## Project Structure

```
papertrail/
├── mobile/          # React Native (Expo) app
│   ├── app/         # Expo Router screens
│   ├── components/  # Reusable UI components
│   ├── services/    # OCR, storage, search
│   ├── store/       # Zustand state
│   ├── theme/       # Colors, typography, tokens
│   └── types/       # TypeScript types
├── backend/         # Pro-tier API (Node/Fastify)
│   ├── src/
│   │   ├── routes/  # API routes
│   │   ├── services/# Cloud sync, AI, email-to-vault
│   │   └── db/      # Database models
│   └── ...
└── docs/            # Architecture & planning docs
```

---

## Development Phases

| Phase | Branch | Scope |
|---|---|---|
| 1 | `phase/1-foundation` | Project setup, navigation, theme, local DB |
| 2 | `phase/2-capture` | Camera scan, photo import, PDF upload, OCR |
| 3 | `phase/3-organize` | Folders, tags, search, comments |
| 4 | `phase/4-reminders` | Manual reminders, expiry alerts, health score |
| 5 | `phase/5-export` | PDF export, ZIP, share sheet, biometric lock |
| 6 | `phase/6-pro-cloud` | Cloud sync, auth, email-to-vault, multi-device |
| 7 | `phase/7-pro-ai` | AI naming, categorization, expiry detection, NL search |
| 8 | `phase/8-pro-sharing` | Shared vaults, secure links, accountant export |
| 9 | `phase/9-analytics` | Spending analytics, enhanced health score |
| 10 | `phase/10-polish` | Animations, onboarding, widgets, App Store prep |

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/mrnickrushing/Papertrail.git
cd Papertrail/mobile

# Install dependencies
npm install

# Start the dev server
npx expo start
```

---

## Contributing

All feature work happens on `phase/*` branches. PRs merge into `main` at the end of each phase.

---

## License

MIT
