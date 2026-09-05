# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging and locating treasures, preserving ownership/provenance records, receiving evidence-backed intelligence, and eventually buying, selling, trading, discovering, valuing, insuring, and protecting collectibles through the wider Kingdom.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified checkpoint:** the Royal Vault now includes permanent owner-scoped treasure records, hierarchical storage, secure private media, voice/talk-to-text, transactional JSON/CSV migration, a cross-device **Royal Intake Queue**, progressive camera barcode scanning, real review-only ISBN and UPC/EAN/GTIN catalog candidates, an append-only **Provenance & Ownership Ledger**, cycle-safe individual collection/location stewardship, **previewed atomic bulk treasure reorganization**, and **private Saved Vault Views with deterministic large-collection paging**.

Latest verified implementation gate: **Kingdom Quality Gates #475** — run `33969652785` — **PASS** on commit `0b43608065020e8fa9a8e13ff1e529193a167cac`.

The live Vault no longer relies on one browser request for as many as 500 treasure rows. Its inventory uses bounded **50-record keyset pages** with a Load more control, a permanent UUID tie-breaker, opaque query-bound cursors, and a 100-record server maximum. Automated large-fixture tests traverse 135 equal-sort records exactly once, and `EXPLAIN QUERY PLAN` regression tests confirm SQLite selects the dedicated paging indexes for default and collection-scoped retrieval.

Collectors can save the current search/filter/sort state as a private **Saved Vault View**, then apply, update, rename, or delete that definition. A saved view is not another collection and does not store a stale item snapshot; every application executes against current authoritative Vault records. Deleting a view deletes only the definition and never treasures, media, provenance, collection structure, or ownership data.

This pass followed the locked K.I.N.G.S. construction documents first. Current PriceCharting, Ludex, CollX, and HomeBox research reinforced reusable collection views, strong search/filter/sort, cross-device collection management, and low-friction large-inventory navigation. The Kingdom strengthens those patterns with owner isolation, strict normalized saved state, live-data execution, deterministic keyset cursors, server page boundaries, and verified database index use. See `docs/research/2026-09-05-IMP-005-SAVED-VIEWS-LARGE-COLLECTIONS.md`.

The next engineering target is **category-specific catalog intelligence, trading cards first**. Evidence-backed market valuation, visual recognition, broader comic/video-game/vinyl catalogs, insurance outputs, and Marketplace ownership transfer remain separate future milestones and are not represented as live.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent engineering mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — exact recoverable build state, verification evidence, limitations, and next target.
- [`docs/research/`](docs/research/) — dated construction-document, competitor, standards, provider/API, GitHub, and technical reconnaissance used before meaningful build work.

After every substantial verified implementation milestone, `docs/MISSION-PROGRESS.md` must be updated so development can resume from the repository rather than depending on a chat session.

## Permanent engineering rules

- The locked K.I.N.G.S. construction documents are the primary build guide; researched improvements may strengthen them but must not silently replace product intent.
- Research current competitors/open-source patterns before each meaningful build pass.
- Build real, executable, production-oriented functionality; never present simulated integrations or decorative-only interfaces as complete features.
- Verify changes with the strongest available lint, contract, automated-test, production-build, artifact, dependency-audit, and query-plan gates relevant to the milestone.
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
- collection groups plus responsive collection editing;
- arbitrary-depth physical storage plus responsive rename/reparent editing;
- previewed atomic bulk movement between collection and/or physical-storage organization;
- private Saved Vault Views that store normalized query/filter/sort definitions only;
- deterministic keyset pagination with default 50 / max 100 records per page;
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

### Review-only external catalog evidence

The provider-neutral catalog boundary currently supports:

- **Open Library** for low-volume checksum-valid ISBN/book candidate lookup;
- **UPCitemdb** for low-volume checksum-valid UPC/EAN/GTIN retail product candidates.

Provider access is bounded by validation, HTTPS-only external transport, timeouts, response-size limits, conservative serialized rates, caching, authenticated Kingdom routes, and explicit review semantics. Lookup itself never writes a treasure.

UPCitemdb provider prices, offers, merchant links/domains, and images are deliberately excluded from the identification model and cannot become Kingdom market value, trade value, or purchase price.

### Provenance & Ownership Ledger

Saved treasures expose an append-only provenance timeline backed by `vault_provenance_events`.

Verified behavior includes acquisition, ownership/provenance note, supporting-document, loan/custody, sale/gift/trade, loss/stolen/recovery, and correction events; amount/currency validation; owner isolation; audit events; no ordinary update/delete API; archive survival; portable export; responsive timeline UI; and explicit `collector-recorded` / `independentlyVerified: false` truthfulness policy.

### Cycle-safe individual reorganization

Collection and physical-location edits are owner-authenticated, field-allowlisted, and cycle-checked. Location branches can move without replacing descendant or treasure UUIDs, and authoritative paths reload from server state after save. Destructive collection/location DELETE is not exposed through the stewardship routes.

### Previewed atomic bulk reorganization

The Vault can move 1–100 explicitly selected permanent treasure UUIDs through a persistent server-owned preview. Preview changes nothing. Commit requires an `Idempotency-Key`, rechecks every selected treasure and destination inside one `BEGIN IMMEDIATE` SQLite transaction, aborts the entire batch on stale state, preserves permanent treasure identity/media/provenance/data, and records linked movement history. The responsive browser exposes search, multi-select, destination keep/clear/set, exact preview, and explicit confirmation. Destructive mass archive/delete is not included.

### Saved Vault Views + large-collection retrieval

Verified through Quality Gates #464, #474, and #475:

- owner-scoped saved-view SQLite persistence;
- strict normalized saved filter/sort allowlist;
- create/list/read/update/delete saved-view APIs;
- current-data execution instead of frozen result snapshots;
- owner isolation without cross-owner view disclosure;
- deterministic keyset pages with permanent UUID tie-breaking;
- query-bound opaque cursors that reject filter/sort mismatch;
- default 50 / maximum 100 records per page;
- 135 equal-primary-sort records traversed exactly once across pages;
- responsive Save current / Apply / Update / Rename / Delete view controls;
- normal Vault inventory migrated from the legacy `limit=500` browser path to `/api/vault/query` + Load more;
- honest loaded-result labels rather than an unproven total;
- dedicated owner/active/sort and collection/location paging indexes;
- automated `EXPLAIN QUERY PLAN` assertions verifying SQLite selects the intended default and collection-scoped indexes;
- production artifact verification for the query service, HTTP route, pagination helpers, saved-view UI, and CSS.

## Truthfulness boundary

Market values remain absent until a real evidence-backed valuation service is implemented. A barcode, image, title match, external provider result, AI suggestion, ISBN match, catalog ID, receipt, certificate number, grading label, or collector-entered provenance statement is not automatically authoritative. Provider identifiers and supporting records may contribute evidence, but the permanent Kingdom treasure UUID remains the authoritative item identity.

## Current next target

**Category-specific catalog intelligence — trading cards first.**

The next build pass will research current trading-card data providers, official/public sources, active open-source card databases, licensing/terms, set/card-number and variant/parallel semantics, grading boundaries, rate limits, and collector-app identification workflows. The implementation will extend the existing review-only provider-neutral candidate architecture and will not silently turn provider matches or market offers into authoritative identity or Kingdom valuation.
