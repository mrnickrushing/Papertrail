# FileTrail — Tech Stack

## Mobile (React Native / Expo)

| Concern | Library |
|---|---|
| Framework | Expo SDK (latest) |
| Navigation | Expo Router (file-based) |
| Local Database | Expo SQLite + WatermelonDB |
| State Management | Zustand |
| OCR (iOS) | Apple Vision Framework via expo-modules |
| OCR (Android) | Google ML Kit via react-native-mlkit |
| PDF handling | react-native-pdf-lib / expo-print |
| Camera | expo-camera |
| File system | expo-file-system |
| Notifications | expo-notifications |
| Biometrics | expo-local-authentication |
| Styling | StyleSheet + custom design tokens |

## Backend (Pro Features)

| Concern | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Fastify |
| Auth | Supabase Auth |
| Database | PostgreSQL (Supabase) |
| Cloud Storage | Cloudflare R2 |
| AI Naming/Categorization | OpenAI GPT-4o / Claude |
| Vector Search | pgvector (Supabase) |
| Email-to-Vault | Postmark Inbound |
| Queue | BullMQ (Redis) |

## Infrastructure

| Concern | Provider |
|---|---|
| Hosting | Railway |
| CDN / Storage | Cloudflare R2 |
| Database | Supabase |
| Push Notifications | Expo Push + APNs / FCM |
| CI/CD | GitHub Actions |
