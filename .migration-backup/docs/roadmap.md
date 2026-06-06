# PaperTrail Current State and Remaining Roadmap

_Last reviewed: 2026-06-03._

This document records the current repository state and the implementation roadmap for the remaining PaperTrail phases. It supersedes the older phase table in the README that split reminders, export, cloud, AI, sharing, analytics, and polish into separate legacy phases.

## Current Repository State

The app appears to have the Phase 1-3 foundation in place: an Expo Router mobile app, local document persistence, capture/import flows, folders, basic tags, favorites, comments metadata, and local search primitives. The current codebase also includes several early Phase 4-adjacent placeholders, but the native viewer/crop/export foundation has not been completed yet.

### Implemented or partially implemented

- **Expo mobile app foundation:** Expo SDK 52, Expo Router, Zustand, Expo SQLite, file system, sharing, image manipulation, gesture handler, Reanimated, camera, document picker, and image picker are present in `mobile/package.json`.
- **Local-first storage model:** Documents, folders, tags, comments, and FTS search tables are represented in the SQLite database service and mirrored in the Zustand document store.
- **Capture/import flow:** Camera/photo/PDF import paths route into a review screen that persists files, generates image thumbnails, applies basic metadata, and stores documents.
- **Image cropper foundation:** The capture flow has an `ImageCropper` component that already uses `expo-image-manipulator`, but it is still a fixed centered crop box rather than a gesture-driven crop rectangle with handles.
- **Viewer foundation:** Images can be previewed with scroll-view zoom, while PDFs still render as a placeholder card/thumbnail rather than a native PDF viewer.
- **Search foundation:** Search covers title/category/tag/OCR matching in the document store and displays snippets in the Search tab.
- **Organization foundation:** Folders, categories, favorites, and document metadata editing exist, but bulk actions, advanced filtering, and tag editing UI are still future work.

### Key gaps before Phase 4 acceptance

- **No native PDF module stack yet:** `react-native-pdf`, `react-native-blob-util`, Expo config plugins for PDF viewing, `expo-dev-client`, and `eas.json` are not present yet.
- **PDF viewer is still a placeholder:** The viewer screen shows a PDF thumbnail/icon and page count metadata rather than in-app PDF rendering with page callbacks, zoom, and error states.
- **Crop UX is not yet drag-based:** The cropper calculates and applies a centered crop rectangle; it does not expose draggable edges/corners or convert arbitrary view-space crop bounds yet.
- **Export service is missing:** Single-document sharing is handled inline in the viewer, but there is no dedicated `exportService.ts` and no ZIP export-all implementation.
- **Expo Go fallback is not formalized:** Phase 4 native features need explicit development-build detection and clear fallback copy when unavailable in Expo Go.

## Recommended Build Order

1. **Phase 4 — Viewer, Crop, Export Foundation**
2. **Phase 5 — Organization and Bulk Actions**
3. **Phase 6 — OCR Quality, Metadata Intelligence, Search Upgrades**
4. **Phase 7 — Backup, Sync, Restore**
5. **Phase 8 — Security and Privacy Hardening**
6. **Phase 9 — Polish, Performance, Reliability**
7. **Phase 10 — Launch Prep**

This order keeps functional document usability first, then scales organization/search, then protects user data before polishing for public release. Development builds become necessary in Phase 4 because native modules are required for real PDF viewing and ZIP export plumbing.

## Phase 4 — Viewer, Crop, Export Foundation

**Goal:** Make stored documents truly usable after capture.

### Scope

- Native PDF viewer with zoom, page count, page changes, and error states.
- Real drag-based crop UI with corner handles.
- Export a single document via the system share sheet.
- Export all documents as a ZIP archive.
- Add `expo-dev-client`, EAS profiles, and config plugins.
- Add graceful fallback messaging when running in Expo Go.

### Deliverables

- `react-native-pdf` wired with `react-native-blob-util` and Expo config plugins.
- `ImageCropper` upgraded to a gesture-driven crop box.
- `exportService.ts` for single-file share and multi-file ZIP export.
- Viewer screen updated with real PDF mode instead of the placeholder.
- `eas.json` development profile and README setup notes.

### Acceptance Criteria

- Local PDFs open in-app and support page navigation/zoom in development builds.
- Crop output visually matches the selected area.
- Export all creates a ZIP and opens the share sheet.
- Phase 4 native features fail gracefully in Expo Go with a clear development-build notice.

## Phase 5 — Organization and Bulk Actions

**Goal:** Make the app useful at scale once users have dozens or hundreds of documents.

### Scope

- Multi-select mode from the home screen and folder views.
- Bulk move to folder.
- Bulk delete.
- Bulk favorite/unfavorite.
- Tag creation and tag editing UI.
- Filter chips for category, favorites, OCR status, file type, folder.
- Sort options for newest, oldest, title, size, category.
- Smart sections: Recent, Favorites, Unfiled, Receipts, Contracts.

### Deliverables

- Selection toolbar and checkbox/selection states.
- Tag editor modal or sheet.
- Filter/sort bar on Home and Search.
- Store updates for bulk mutations.
- Better empty states for each filtered view.

### Acceptance Criteria

- Users can select many documents and move/delete/favorite them in one action.
- Filters combine cleanly with search.
- Folder and tag organization feels fast and obvious.
- No action requires opening each document one by one.

## Phase 6 — OCR Quality, Metadata Intelligence, Search Upgrades

**Goal:** Turn PaperTrail from a file cabinet into a document intelligence app.

### Scope

- OCR retry/reprocess action.
- Background OCR queue for pending documents.
- Better OCR preprocessing: grayscale, thresholding, contrast presets.
- Extract likely merchant names, dates, totals, IDs, and tax years.
- Highlight search terms inside OCR text in the viewer.
- Search ranking improvements.
- Saved searches or quick search suggestions.
- Search by structured fields such as merchant, total, doctor, issuer, or date range.

### Deliverables

- OCR job status model with retry counts.
- Metadata extraction pipeline for category-specific parsing.
- Search index schema update.
- Search suggestions and recent searches.
- Structured chips on documents, such as `Total: $43.12` or `Issuer: DMV`.

### Acceptance Criteria

- OCR results improve after enhancement/reprocess.
- Search feels smarter than substring matching.
- Receipts, IDs, and tax documents surface useful extracted facts.
- Viewer jumps to relevant OCR snippets when a result is opened.

## Phase 7 — Backup, Sync, Restore

**Goal:** Protect user data and make the app trustworthy long term.

### Scope

- Local encrypted backup bundle.
- Restore from backup.
- Optional cloud sync architecture, likely starting with Supabase or iCloud/Drive export before full multi-device sync.
- Conflict handling rules.
- Backup reminders and last-backup status.
- Import/export metadata versioning.

### Deliverables

- Backup file format with versioning.
- Restore flow with preview and confirmation.
- Cloud sync architecture decision doc.
- Sync state UI: synced, pending, failed.
- Migration layer for schema upgrades between app versions.

### Acceptance Criteria

- A user can wipe the app and restore documents/metadata from backup.
- Backup files are versioned and migration-safe.
- Restore does not silently overwrite newer data.
- Sync architecture is defined clearly before implementation.

## Phase 8 — Security and Privacy Hardening

**Goal:** Make the app safe enough for sensitive documents like IDs, medical forms, and taxes.

### Scope

- App lock with biometric auth.
- Sensitive-folder lock or per-document privacy shield.
- Optional hidden mode for specific documents.
- Encrypted-at-rest strategy review.
- Screenshot blocking on Android and privacy blur on app backgrounding.
- Redaction tools for exports/shares.
- Security settings page.

### Deliverables

- Face ID / Touch ID / Android biometrics gate.
- Background blur or lock when the app enters an inactive state.
- Redaction overlay tool for image/PDF export copies.
- Privacy policy and in-app local-only/sync-off messaging.
- Audit of what is and is not stored externally.

### Acceptance Criteria

- Sensitive documents require auth when enabled.
- Shared copies can be redacted.
- The app clearly communicates local-only vs. synced behavior.
- Privacy protections work consistently on both platforms.

## Phase 9 — Polish, Performance, Reliability

**Goal:** Make the app feel production-ready.

### Scope

- Performance audit for large libraries and long OCR text.
- Thumbnail caching and cleanup strategy.
- PDF rendering optimization.
- Storage quota warnings.
- Better animations/transitions.
- Skeleton loaders for all async views.
- Crash/error logging.
- QA sweep on permissions, offline behavior, and bad files.
- Accessibility improvements.

### Deliverables

- Performance checklist and fixes.
- Error boundaries and logging integration.
- Polished loading and empty states everywhere.
- Accessibility pass: labels, touch targets, contrast, dynamic text.
- Device matrix QA notes for iPhone and Android variants.

### Acceptance Criteria

- Scrolling remains smooth with large document counts.
- Broken/corrupt files fail gracefully.
- The app feels consistent across all screens.
- Major flows are accessible and testable.

## Phase 10 — Launch Prep

**Goal:** Prepare for public beta or App Store/TestFlight release.

### Scope

- Onboarding flow.
- Permission education screens.
- App icon, splash, screenshots, preview video.
- Beta feedback workflow.
- Store metadata and privacy declarations.
- Analytics events for key product flows.
- Support/contact flow.
- Changelog and versioning discipline.

### Deliverables

- Onboarding for capture, folders, search, and privacy story.
- App Store / Play Store assets.
- Privacy nutrition labels / data safety form inputs.
- Release checklist.
- Beta testing plan and feedback template.

### Acceptance Criteria

- New users can understand the app without outside help.
- App review metadata is ready.
- Permission prompts are contextual and not jarring.
- The team can measure onboarding, retention, export, and backup usage.
