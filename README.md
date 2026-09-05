# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging and locating treasures, preserving ownership/provenance records, receiving evidence-backed intelligence, and eventually buying, selling, trading, discovering, valuing, insuring, and protecting collectibles through the wider Kingdom.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified checkpoint:** the Royal Vault now includes permanent owner-scoped treasure records, hierarchical storage, secure private media, voice/talk-to-text, transactional JSON/CSV migration, a cross-device **Royal Intake Queue**, progressive camera barcode scanning, real review-only ISBN and UPC/EAN/GTIN catalog candidates, an append-only **Provenance & Ownership Ledger**, and a verified browser bootstrap that actually loads the transactional import, Intake Queue, scanner, and provenance enhancement modules on the Vault page.

Latest verified code gate: **Kingdom Quality Gates #425** — run `33963495455` — **PASS** on commit `34ca527c4f608d07290d43fa32fddacedc5df0f0`.

A connection-interrupted build had left several already-tested Vault enhancement files packaged but not actually loaded by the live Vault page. That gap is now closed through an ordered `vault-extras.js` loader. The loader brings up transactional import first, then Intake Queue, then scanner, then provenance; it stops on the first failed module instead of pretending later enhancements loaded.

The reorganization foundation has also advanced: **Quality Gates #422** passed the owner-scoped collection/location repository and cycle-safe service tests. Collection rename preserves membership and permanent treasure IDs; nested location branch moves preserve descendants and treasure references while recalculating paths; self/descendant/cross-owner parent moves are rejected. This reorganization logic is not yet exposed through live PATCH routes or browser edit controls.

The next engineering target is therefore a deliberately small production slice: **authenticated PATCH APIs for collection and location reorganization**, followed by responsive individual edit controls. Previewed atomic bulk treasure movement remains after those single-structure controls are proven.

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

The live Vault page now schedules one dependency-safe enhancement loader after the core Vault and Keeper code initializes. It loads:

1. transactional import UI;
2. Royal Intake Queue UI;
3. progressive scanner UI;
4. provenance timeline UI.

The loader is regression-tested to preserve that order and stop immediately on a failed dependency rather than leaving later tools in a misleading half-loaded state.

### Review-only external catalog evidence

The provider-neutral catalog boundary supports:

- **Open Library** for low-volume checksum-valid ISBN/book candidate lookup;
- **UPCitemdb** for low-volume checksum-valid UPC/EAN/GTIN retail product candidates.

Provider access is bounded by validation, HTTPS-only external transport, timeouts, response-size limits, conservative serialized rates, caching, authenticated Kingdom routes, and explicit review semantics. Lookup itself never writes a treasure.

UPCitemdb provider prices, offers, merchant links/domains, and images are deliberately excluded from the identification model and cannot become Kingdom market value, trade value, or purchase price.

### Provenance & Ownership Ledger

Saved treasures expose an append-only provenance timeline backed by `vault_provenance_events`.

Verified behavior includes:

- acquisition, ownership/provenance note, supporting-document, loan/custody, sale/gift/trade, loss/stolen/recovery, and correction events;
- effective date, counterparty/source, method, transaction amount/currency, reference, evidence URL, and notes;
- amount stored as integer cents with explicit currency;
- same-owner/same-treasure correction linkage;
- owner isolation;
- normal audit events for each append;
- no ordinary update/delete API;
- provenance survives treasure archive;
- export schema version 2 includes portable provenance events;
- responsive saved-treasure entry/timeline UI;
- explicit `collector-recorded` / `independentlyVerified: false` truthfulness policy.

### Reorganization foundation

The current green domain foundation supports:

- owner-scoped collection name/description updates;
- owner-scoped location parent/name/type/notes updates;
- unique collection-name enforcement;
- server-authoritative rejection of location self-parenting and descendant cycles;
- cross-owner parent/reference rejection;
- moving an entire location branch while preserving descendant IDs;
- recalculating nested location paths after a branch move;
- preserving permanent treasure UUIDs and treasure collection/location references;
- structure-level audit events rather than inventing treasure-change events for a container rename.

This domain/service layer passed Quality Gates #422 but is **not yet represented as a live collector feature** until authenticated PATCH routes and browser controls are added and verified.

## Truthfulness boundary

Market values remain absent until a real evidence-backed valuation service is implemented. A barcode, image, title match, external provider result, AI suggestion, ISBN match, catalog ID, receipt, certificate number, or collector-entered provenance statement is not automatically authoritative. Provider identifiers and supporting records may contribute evidence, but the permanent Kingdom treasure UUID remains the authoritative item identity.

## Current next target

**Vault Reorganization — authenticated PATCH API slice.**

The next short build will expose the already-green collection/location stewardship service through owner-authenticated PATCH routes, prove owner isolation and cycle errors at the HTTP boundary, and only then add responsive individual edit controls. Previewed atomic bulk treasure movement remains the following slice; destructive mass archive/delete remains separately gated.
