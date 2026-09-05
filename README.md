# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging and locating treasures, preserving ownership/provenance records, receiving evidence-backed intelligence, and eventually buying, selling, trading, discovering, valuing, insuring, and protecting collectibles through the wider Kingdom.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified checkpoint:** the Royal Vault now includes permanent owner-scoped treasure records, hierarchical storage, secure private media, voice/talk-to-text, transactional JSON/CSV migration, a cross-device **Royal Intake Queue**, progressive camera barcode scanning, real review-only ISBN and UPC/EAN/GTIN catalog candidates, an append-only **Provenance & Ownership Ledger**, a verified browser enhancement bootstrap, and live cycle-safe **collection/location reorganization PATCH APIs**.

Latest verified code gate: **Kingdom Quality Gates #433** — run `33964005746` — **PASS** on commit `bd0502f57d9bb333f2ea262c93d27e495cd45462`.

The reorganization API now exposes owner-authenticated `PATCH /api/vault/collections/:id` and `PATCH /api/vault/locations/:id`. Collection rename preserves treasure membership and permanent treasure UUIDs. Location rename/reparent preserves descendant IDs and treasure references while recalculating paths. Self-parent, descendant-cycle, cross-owner, unsupported-field, and unauthorized mutations are rejected server-side. No collection/location DELETE shortcut or bulk movement endpoint was added.

Competition research for this pass reconfirmed the product direction: explicit edit intent, omitted-field PATCH preservation, clear selection before bulk changes, and one authoritative movement rule set shared by individual and future bulk workflows. See `docs/research/2026-09-05-IMP-005-REORGANIZATION-PATCH-PASS.md`.

The next engineering target is a deliberately small browser slice: **responsive individual collection and location edit controls** backed only by the verified PATCH APIs. Previewed atomic bulk treasure movement remains after those controls are proven.

Evidence-backed current valuation, image recognition, broad category-specific catalog coverage, and Marketplace ownership transfers remain separate future milestones and are not represented as live.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent engineering mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — exact recoverable build state, verification evidence, limitations, and next target.
- [`docs/research/`](docs/research/) — dated competitor, standards, provider/API, GitHub, and technical reconnaissance used before meaningful build work.

After every substantial verified implementation milestone, `docs/MISSION-PROGRESS.md` must be updated so development can resume from the repository rather than depending on a chat session.

## Permanent engineering rules

- Build real, executable, production-oriented functionality; never present simulated integrations or decorative-only interfaces as complete features.
- Verify changes with the strongest available lint, contract, automated-test, production-build, artifact, and dependency-audit gates.
- Never fabricate collection totals, market values, Marketplace activity, notifications, identification certainty, provenance verification, or other domain data when no authoritative evidence exists.
- Never commit credentials, provider keys, access tokens, or secrets.
- Keep collector authority over destructive, ownership-changing, and authoritative record actions.
- AI and provider assistance must surface uncertainty rather than silently inventing an identification, value, provenance claim, or exact variant.
- Prefer portable data and provider-independent permanent Kingdom identities.
- Keep mobile, Chromebook, tablet, and desktop workflows first-class.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared intelligence/router core for the K.I.N.G.S. application family. Collector's Kingdom owns collector identity, authorization, Vault records, Marketplace rules, ownership state, and product actions. AI model/provider routing stays behind the governed server-to-server K.I.N.G.S. AI boundary, and provider credentials never belong in browser code.

The Keeper can advise through K.I.N.G.S. AI, but Kingdom record mutations remain explicitly authorized by Collector's Kingdom and the collector.

## Great Hall

IMP-004 established the authenticated central Kingdom experience with personalized Great Hall, permanent castle-and-grounds geography, Royal Vault, Kingdom Street Market, real recent account activity, honest service availability states, quick actions, room-aware Keeper roles, and responsive royal-estate UI.

With the authoritative Vault wired, the Great Hall exposes `/vault.html` and reports real Vault record/unit counts instead of sample data.

## Royal Vault — verified capability

The Vault establishes one permanent treasure identity that later Marketplace, provenance, grading, transfer, insurance, legacy, and valuation services can reuse rather than duplicating item records.

Current verified capability includes:

- owner-scoped treasure create/read/update/archive;
- collection groups;
- arbitrary-depth physical storage such as room → safe → shelf → binder → page → pocket;
- condition, variant, quantity, acquisition, cost, identifiers, descriptions, notes, and custom attributes;
- normalized accent-tolerant search/filter/sort;
- duplicate candidate detection without destructive automatic merging;
- treasure/media/audit history;
- real record/unit/category statistics;
- purchase totals separated by currency;
- complete versioned JSON export including archived records;
- responsive Royal Vault browser workspace;
- The Keeper acting as Royal Curator.

### Secure treasure media

Private JPEG, PNG, WebP, GIF, AVIF, and PDF files are stored outside the public webroot with generated storage keys, file-signature/MIME/extension checks, owner authorization, storage limits, private retrieval, deletion, and audit events. No antivirus/sandbox/CDR capability is claimed.

### Voice command and talk-to-text

Where browser speech recognition is available, the Kingdom supports spoken navigation, Keeper questions, Vault search, safe treasure-entry commands, and dictation into selected fields. Typed controls remain available everywhere, and destructive voice commands are intentionally excluded.

### Transactional migration

The Vault accepts JSON and CSV migration sources through a review-first workflow with persistent preview batches, CSV mapping, validation/rejected/duplicate-review rows, explicit decisions, atomic all-or-nothing commit, stale-preview protection, idempotent retry, and no blind import writes.

### Royal Intake Queue & barcode scanner

Collectors can capture UPC, EAN, ISBN, catalog, serial, SKU, or custom identifiers from phone, Chromebook, or desktop into an account-scoped server-side queue. Repeated pending captures merge into a capture count and dismissed history is preserved.

On secure browsers exposing native `BarcodeDetector`, the Vault adds explicit Start/Stop camera capture, supported-format discovery, rear-camera preference, frame debounce, authenticated Intake Queue writes, and track shutdown on leave/background. Manual intake remains the fallback.

Camera permission is least-privilege: `/vault.html` receives `camera=(self)`, while ordinary Kingdom rooms and JSON APIs continue to receive `camera=()`.

### Verified Vault enhancement bootstrap

The live Vault page schedules one dependency-safe enhancement loader after the core Vault and Keeper code initializes. It loads transactional import UI, Royal Intake Queue UI, progressive scanner UI, and provenance timeline UI in that order. The loader is regression-tested to stop on the first failed dependency rather than leaving later tools in a misleading half-loaded state.

### Review-only external catalog evidence

The provider-neutral catalog boundary supports:

- **Open Library** for low-volume checksum-valid ISBN/book candidate lookup;
- **UPCitemdb** for low-volume checksum-valid UPC/EAN/GTIN retail product candidates.

Provider access is bounded by validation, HTTPS-only external transport, timeouts, response-size limits, conservative serialized rates, caching, authenticated Kingdom routes, and explicit review semantics. Lookup itself never writes a treasure.

UPCitemdb provider prices, offers, merchant links/domains, and images are deliberately excluded from the identification model and cannot become Kingdom market value, trade value, or purchase price.

### Provenance & Ownership Ledger

Saved treasures expose an append-only provenance timeline backed by `vault_provenance_events`.

Verified behavior includes acquisition, ownership/provenance note, supporting-document, loan/custody, sale/gift/trade, loss/stolen/recovery, and correction events; amount/currency validation; owner isolation; audit events; no ordinary update/delete API; archive survival; export schema version 2; responsive timeline UI; and explicit `collector-recorded` / `independentlyVerified: false` truthfulness policy.

### Cycle-safe reorganization — live API foundation

Verified through Quality Gates #433:

- owner-authenticated `PATCH /api/vault/collections/:id`;
- owner-authenticated `PATCH /api/vault/locations/:id`;
- strict mutable-field allowlists;
- omitted fields remain unchanged;
- explicit `parentId: null` top-level movement supported by the domain service;
- unique collection-name enforcement;
- self-parent and descendant-cycle rejection;
- cross-owner reference rejection;
- branch movement preserves descendant IDs;
- treasure UUID and collection/location references remain intact;
- descendant display paths recalculate from authoritative parent links;
- unsupported fields are rejected instead of silently ignored;
- DELETE is not exposed for these stewardship routes;
- `/api/vault` reports individual reorganization availability while keeping `bulkMoveAvailable: false` and destructive bulk actions unavailable.

The browser still needs collector-facing edit controls before this is a complete end-user reorganization workflow.

## Truthfulness boundary

Market values remain absent until a real evidence-backed valuation service is implemented. A barcode, image, title match, external provider result, AI suggestion, ISBN match, catalog ID, receipt, certificate number, or collector-entered provenance statement is not automatically authoritative. Provider identifiers and supporting records may contribute evidence, but the permanent Kingdom treasure UUID remains the authoritative item identity.

## Current next target

**Vault Reorganization — responsive individual edit controls.**

The next short build will research current UI patterns again, add mobile/Chromebook-friendly collection and location edit controls against the verified PATCH routes, preserve explicit Save/Cancel behavior and visible cycle errors, then run the full gate. Previewed atomic bulk treasure movement remains the following slice; destructive mass archive/delete remains separately gated.
