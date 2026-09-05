# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging and locating treasures, preserving ownership/provenance records, receiving evidence-backed intelligence, and eventually buying, selling, trading, discovering, valuing, insuring, and protecting collectibles through the wider Kingdom.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified checkpoint:** the Royal Vault now includes permanent owner-scoped treasure records, hierarchical storage, secure private media, voice/talk-to-text, transactional JSON/CSV migration, a cross-device **Royal Intake Queue**, progressive camera barcode scanning, review-only ISBN and UPC/EAN/GTIN catalog candidates, an append-only **Provenance & Ownership Ledger**, cycle-safe individual collection/location stewardship, previewed atomic bulk treasure reorganization, private Saved Vault Views with deterministic large-collection paging, and the first **category-specific trading-card catalog intelligence for Pokémon TCG**.

Latest verified implementation gate: **Kingdom Quality Gates #480** — run `33970697179` — **PASS** on commit `fdc04a828119bbeaf8ca18db88c2c8f8a975005f`.

The Pokémon slice adds a real server-side provider behind the existing provider-neutral review-only catalog service. It supports exact `pokemon-card-id` and `pokemon-set-number` evidence, optional server-only API credentials, conservative request pacing, bounded timeouts/response sizes, explicit no-match/rate-limit/provider failures, and identification-only field mapping. Provider commerce/price material is deliberately excluded from normalized evidence and cannot become Kingdom valuation through this path.

The Royal Intake Queue now accepts both exact Pokémon identifier modes. From a pending intake item, the collector can request a candidate and copy approved metadata into a **new unsaved treasure editor**. The draft can prefill title, Trading Card category, Pokémon, set/series, catalog key, rarity/artist and provider evidence attributes. It does **not** auto-select the physical card variant, grade, condition, provenance, market value, purchase price, or ownership claim, and it performs no automatic Vault mutation.

This pass followed the locked K.I.N.G.S. construction documents first and researched current collector/card workflows and provider constraints. Ludex/CollX reinforced fast scan/review/organization patterns; current TCGplayer documentation states new API access is not being granted, so the Kingdom does not depend on obtaining new TCGplayer access. The implemented first Pokémon adapter uses the documented Pokémon TCG API exact-card path, while TCGdex remains a later multilingual/fallback candidate after multi-provider reconciliation rules exist. See `docs/research/2026-09-05-IMP-005-TRADING-CARD-CATALOG.md`.

The next engineering target is **Magic: The Gathering catalog intelligence via Scryfall**, using the same review-only evidence boundary. Image recognition, automatic parallel/finish identification, grading verification, evidence-backed market valuation, destructive bulk actions, and Marketplace ownership transfer remain separate future milestones and are not represented as live.

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
- Never fabricate collection totals, market values, Marketplace activity, notifications, identification certainty, provenance verification, grading certainty, or other domain data when no authoritative evidence exists.
- Never commit credentials, provider keys, access tokens, or secrets.
- Keep collector authority over destructive, ownership-changing, and authoritative record actions.
- AI and provider assistance must surface uncertainty rather than silently inventing an identification, value, provenance claim, exact physical variant, or grade.
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
- private Saved Vault Views storing normalized query/filter/sort definitions only;
- deterministic keyset pagination with default 50 / maximum 100 records per page;
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

Collectors can capture UPC, EAN, ISBN, Pokémon card IDs/set-card keys, catalog, serial, SKU, or custom identifiers from phone, Chromebook, or desktop into an account-scoped server-side queue. Repeated pending captures merge into a capture count and dismissed history is preserved.

On secure browsers exposing native `BarcodeDetector`, the Vault adds explicit Start/Stop camera capture, supported-format discovery, rear-camera preference, frame debounce, authenticated Intake Queue writes, and track shutdown on leave/background. Manual intake remains the fallback.

Camera permission is least-privilege: `/vault.html` receives `camera=(self)`, while ordinary Kingdom rooms and JSON APIs continue to receive `camera=()`.

### Review-only external catalog evidence

The provider-neutral catalog boundary currently supports:

- **Open Library** for low-volume checksum-valid ISBN/book candidate lookup;
- **UPCitemdb** for low-volume checksum-valid UPC/EAN/GTIN retail product candidates;
- **Pokémon TCG API** for exact Pokémon provider-card-ID or explicit set-ID/card-number candidates.

All catalog lookup paths are authenticated, review-only, cache/rate/timeout bounded, and perform no automatic Vault write. Provider identifiers remain supporting evidence rather than permanent Kingdom identity.

UPCitemdb commerce fields and Pokémon provider TCGPlayer/Cardmarket-style pricing/commerce material are deliberately excluded from normalized identification evidence and cannot become Kingdom market value, trade value, or purchase price through the catalog path.

For Pokémon, an exact provider match still does not prove the collector's physical parallel/finish, condition, grade, authenticity, provenance, ownership, or value. Those facts require separate evidence and collector confirmation.

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
- automated `EXPLAIN QUERY PLAN` assertions verifying SQLite selects the intended default and collection-scoped indexes.

### Pokémon trading-card catalog intelligence

Verified through **Kingdom Quality Gates #480**:

- exact `pokemon-card-id` and `pokemon-set-number` provider modes;
- optional server-only Pokémon API key through runtime configuration;
- HTTPS outside local tests;
- serialized conservative provider request pacing;
- timeout and maximum response-size protections;
- explicit 404 no-match, 429 rate-limit, malformed JSON/payload, and provider failure behavior;
- normalized identification-only candidate fields;
- provider pricing/commerce and images excluded from normalized candidate evidence;
- Royal Intake support for exact Pokémon identifier capture and repeated-pending merge;
- catalog-key duplicate candidate warning against existing Vault records without asserting identity;
- responsive `Find Pokémon card candidate` workflow;
- copy-to-editor remains a new **unsaved** treasure draft;
- set/series, card number, rarity, artist, Pokémon metadata, and provider evidence attributes can prefill;
- no automatic grade, condition, physical variant/parallel, provenance, value, purchase price, ownership change, or Vault save;
- production runtime composition asserts the Pokémon provider and both capability flags while keeping `automaticVaultMutation=false` and `valuationFromCatalogProviders=false`.

## Truthfulness boundary

Market values remain absent until a real evidence-backed valuation service is implemented. A barcode, image, title match, external provider result, AI suggestion, ISBN match, catalog ID, receipt, certificate number, grading label, or collector-entered provenance statement is not automatically authoritative. Provider identifiers and supporting records may contribute evidence, but the permanent Kingdom treasure UUID remains the authoritative item identity.

## Current next target

**IMP-005 — Magic: The Gathering catalog intelligence via Scryfall.**

The next build pass will extend the same provider-neutral review-only boundary with MTG-specific identifiers and print semantics. Research/implementation must cover Scryfall's current API guidance, exact collector-number/set identifiers, language, finishes, frame/layout/card-face semantics, reprints, promo/digital distinctions, and bulk-data guidance. The adapter must send an appropriate `User-Agent` and `Accept`, stay within Scryfall traffic guidance, avoid aggressive retries, and keep price/commerce/image material outside authoritative valuation/ownership. A provider match must not silently choose the collector's physical finish, condition, language, grade, or provenance.
