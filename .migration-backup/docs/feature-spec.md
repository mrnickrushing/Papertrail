# FileTrail — Feature Specification

## Free Tier

### Document Management
- Capture via camera, photo library, PDF file picker
- On-device OCR using Apple Vision (iOS) and Google ML Kit (Android)
- Manual filename + auto-suggested filename from OCR content
- Custom folder hierarchy (unlimited depth)
- Multi-tag system
- Version history (local)
- Starred / pinned documents
- Bulk select, move, delete

### Search
- Filename search
- Full-text OCR content search (local)
- Filter by folder, tag, date range, document type

### Organization
- Color-coded folders with custom icons
- Document types: receipt, contract, ID, warranty, medical, insurance, tax, invoice, personal
- Comments on any document
- Card view and list view toggle

### Reminders
- Manual date-based reminders per document
- Push notification delivery

### Security
- Biometric lock (Face ID / Touch ID)
- PIN fallback
- No account required

### Export
- Share individual docs via iOS/Android share sheet
- Export as PDF
- Export folder as ZIP
- Print via AirPrint

### Document Health Score (Local)
- Checklist of critical document categories
- Flags missing categories (e.g. no ID on file, no insurance doc)
- Local-only, no cloud required

---

## Pro Tier

### Cloud
- End-to-end encrypted cloud sync
- Multi-device access (iPhone, iPad, web)
- Offline access to starred docs
- Email-to-vault (`@filetrail.app` unique address)

### AI
- Auto-naming: reads document, suggests smart filename
- Auto-categorization: places doc in correct folder automatically
- Expiry detection: extracts dates from IDs, warranties, insurance cards
- Duplicate detection: flags similar documents
- Natural-language search: semantic vector search ("find my Verizon bill from 2025")

### Sharing
- Shared vaults: invite family members or business partners
- Permission levels: view-only, edit, admin
- Secure share links: time-limited, optional password
- Activity feed in shared vaults
- Request a document: send a link asking someone to upload to your vault

### Export (Enhanced)
- Accountant export: one-tap export of all docs by tag/date range
- Merge multiple docs into one PDF

### Analytics
- Spending summary by vendor, category, month (from receipt OCR)
- Tax year summary report
- Storage usage breakdown

### Document Health Score (Enhanced)
- Cross-device awareness
- AI-suggested missing documents
- Expiry timeline view
