# IMP-005 — Royal Vault Phase 1 Architecture

## Status

Active implementation of the locked IMP-005 Royal Vault milestone.

The locked Construction Documents remain the highest authority. This document describes only functionality implemented on the active IMP-005 branch and does not claim later Vision, live valuation, certification-provider verification, Marketplace commerce, synchronization infrastructure, insurance, distributed disaster recovery, or production launch work is complete.

## Domain authority

The Royal Vault is the authoritative home for collectible records owned by the authenticated collector.

The Vault owns:

- treasure records;
- flexible lawful category labels and category-aware metadata;
- collection folders;
- physical storage locations;
- tags and Favorites;
- attached Vault image metadata/files;
- supporting evidence metadata/files;
- collection statistics;
- duplicate-candidate detection;
- Saved Vault Views;
- explicit Collection Sets and expected-entry links;
- private Marketplace Preparation state;
- Vault audit history;
- structured ownership/provenance history;
- CSV import/export;
- Vault recovery snapshots;
- bounded authorized Vault context supplied to The Keeper.

The Vault does not own:

- authentication or sessions;
- AI provider/model routing;
- Marketplace transactions, listings, payments, shipping, or offers;
- live valuation-source ingestion;
- certification-provider verification;
- future Vision identification;
- production synchronization conflict resolution;
- production off-site backup scheduling or distributed disaster recovery.

Those remain behind their approved Kingdom boundaries.

## Persistence

Phase 1 uses Node's SQLite runtime and filesystem storage under the configured Kingdom data directory.

Persistent stores:

- `identity.sqlite` — identity/session boundary;
- `vault.sqlite` — authoritative Vault domain records and Vault-adjacent Phase-1 tables;
- `media/vault/` — authenticated Vault image and evidence bytes.

SQLite runs with foreign-key protection, WAL where appropriate, and busy-timeout protection. Browser code and The Keeper never access database files directly.

The schema remains behind service contracts so future storage technologies can replace implementation details without changing product-domain ownership.

## Treasure record and flexible metadata

A Phase-1 treasure supports core fields including:

- title;
- category;
- series/set;
- publisher/manufacturer;
- year;
- condition;
- quantity;
- purchase price/currency/date;
- recorded estimated value/currency;
- valuation source and as-of timestamp;
- collector notes;
- tags;
- conceptual collection folder;
- physical storage location;
- multiple protected images;
- audit history;
- structured ownership history.

Category remains collector-owned text rather than a restrictive enum. Category profiles provide aliases and recommended metadata for major collectible families, while arbitrary lawful custom categories remain valid.

Flexible per-treasure attributes preserve category-specific details without redesigning the core table. Collector-editable attributes record source state and cannot self-promote to externally verified status. Provider/reference text may be recorded, but it remains `not-checked` until a future real verification boundary performs verification.

Estimated value is evidence-bearing estimate data and is never represented as guaranteed sale proceeds.

## Organization model

### Collection folders

Folders answer conceptual questions such as which collection, project, or grouping a treasure belongs to. Folders may be nested.

### Physical locations

Physical locations answer where the actual object is stored. Locations may be nested and support room, safe, cabinet, display case, shelf, binder, page, pocket, box, row, divider, container, and other.

A realistic path may be:

`Collection Room → Fireproof Safe → Shelf B → Baseball Box → Row 2`

Conceptual organization and physical location intentionally remain separate.

## Search architecture

The production search contract is `packages/vault/src/search.mjs`, backed by `search-engine.mjs`.

The extended FTS index covers authorized searchable text from:

- core treasure fields;
- tags;
- conceptual organization;
- physical location;
- category-specific collectible attributes;
- ownership/provenance metadata;
- supporting evidence metadata;
- private Marketplace Preparation text.

Raw evidence bytes are not indexed.

The search engine uses SQLite dirty-record tracking and triggers. Existing data pays a bootstrap/migration cost once. Later inserts, updates, related metadata changes, and deletions mark affected records dirty and refresh incrementally. A clean natural search checks the dirty queue/state rather than walking the collector's entire Vault merely to prove index freshness.

Normal Vault filters, Favorites filtering, sorting, and pagination continue to apply on the extended search contract.

## Collection-view performance

The production runtime installs account-scoped indexes matching real collection sort expressions for:

- Recently Updated;
- Highest Recorded Value;
- Year.

Automated tests use SQLite `EXPLAIN QUERY PLAN` against the actual ORDER BY expressions to verify the expected indexes are selected rather than merely asserting that index definitions exist.

Result pages remain bounded. Search, set summaries, duplicate summaries, and Keeper context each have explicit limits to prevent large collections from becoming unbounded AI/UI payloads.

## Duplicate detection

Phase-1 duplicate detection remains conservative.

The authoritative duplicate candidate basis normalizes:

- title;
- category;
- series;
- manufacturer;
- year.

Matching keys create **possible duplicate groups**. The system never auto-merges or deletes records because condition, provenance, edition, variant, certification, quantity, or intentional duplicate ownership may make both records correct.

The normal duplicate-review UI can show collector-owned candidate groups. Separately, The Keeper receives only a bounded sanitized duplicate-summary view: at most five groups and four treasure summaries per group. Internal duplicate keys, notes, media hashes, certificate references, and unrelated private detail are excluded from Keeper context. Context policy explicitly states automatic merge/delete is forbidden and collector decision is required.

Future catalog/Vision integrations may improve confidence without changing that safety rule.

## Grounded tag recommendations

The locked IMP-005 Keeper requirement to recommend tags is implemented through a deterministic collector-data service rather than an ungrounded model guess.

`recommendations.mjs`:

- reads only the authenticated collector's Vault;
- considers tags from same-category peer treasures;
- increases support for matching series, publisher/manufacturer, and year;
- excludes tags already present on the target treasure;
- returns bounded suggestions with peer counts, strength, evidence signals, and a plain-language explanation;
- never learns from another collector's private tags;
- has no mutation method.

The authenticated API exposes the bounded recommendation result, the Royal Curator receives at most three suggestions per contextual treasure, and the treasure-detail UI presents suggestions as advisory only. The collector must edit the record to choose tags; no tag is automatically applied.

## Collection Sets

Collection Sets model explicit completion requirements instead of guessing from titles.

The hierarchy is:

`Collection Set → Expected Entry → collector-selected owned Treasure link`

Rules include:

- expected entries are explicit;
- expected quantity is explicit;
- completion is derived from current links/quantities;
- one treasure cannot silently satisfy multiple entries in the same set;
- title similarity never automatically completes a set;
- link changes are auditable;
- aggregate set-summary queries support large-scale UI/Keeper use without loading full checklist graphs.

The `Incomplete Sets` system view is based on this authoritative relationship model.

## Favorites and Saved Vault Views

Favorites are explicit owner-scoped relationships and cascade away if the authoritative treasure is deleted.

Saved Vault Views persist collector-selected query/filter/sort/display preferences. Saved views can preserve Grid, List, Binder, and Gallery mode and are owner scoped. Organization-node lifecycle tests ensure stale folder/location filters are removed when those nodes are legitimately deleted.

## Media security

Vault images:

- require an authenticated collector;
- require ownership of the parent treasure;
- are size limited;
- support JPEG, PNG, WebP, HEIC, and HEIF in Phase 1;
- are validated against actual file/container bytes rather than trusting declared `Content-Type` or filename;
- are rejected before directory creation/database persistence when bytes and declared type disagree;
- are stored outside the public static directory;
- receive SHA-256 integrity metadata;
- are retrieved only through owner-scoped API routes.

The browser's camera/photo intake is real file capture. It is not represented as AI identification.

## Supporting evidence

Supporting evidence is separate from normal display media and supports protected PDF/JPEG/PNG/WebP records such as receipts, certificates, authentication paperwork, grading paperwork, appraisals, provenance, insurance/purchase/sale records, condition reports, warranty, loan, legacy, and other evidence.

Evidence files receive byte-signature validation, SHA-256 metadata, owner-scoped retrieval, explicit source type, and verification state. Collector-entered/uploaded evidence does not become independently verified merely because a provider name or certificate identifier is typed into the record.

## Ownership history vs audit history

### Vault audit history

Records system/domain events such as treasure creation/update, media changes, Marketplace Preparation changes, set links, and other authorized domain actions.

### Ownership history

Records the collectible's human ownership/provenance timeline, including acquired, inherited, gifted/transferred in or out, sold, and other ownership events.

Keeping them separate protects operational accountability and collectible provenance.

## Portable intake/export

CSV import is preview-before-commit:

- input is bounded;
- the exact input bytes receive a SHA-256 fingerprint;
- all rows are validated before mutation;
- missing organization paths are reported;
- hierarchy creation is explicit rather than silent;
- duplicate-looking rows generate warnings and are never auto-merged;
- commit rejects changed/unpreviewed input;
- commit uses transactional behavior rather than partially accepting a broken file.

CSV export preserves portable treasure fields and physical organization.

## Recovery architecture

`recovery.mjs` provides a real Phase-1 Vault recovery primitive.

Snapshot creation:

- creates a consistent SQLite snapshot with `VACUUM INTO`;
- validates SQLite integrity and foreign keys;
- identifies only media/evidence paths referenced by the snapshot state;
- verifies source file size and SHA-256 metadata;
- copies referenced files and verifies copied hashes;
- records a manifest with database SHA, record counts, files, and explicit scope limitations.

Verification re-checks database integrity/counts/references and every file hash.

Restore:

- verifies the snapshot first;
- refuses to overwrite an existing database;
- requires an empty/new storage target;
- copies the database and files;
- re-runs integrity/hash checks before returning success.

The snapshot explicitly does **not** claim to include the identity database, off-site replication, automated retention, point-in-time log replay, or distributed disaster recovery. Those are later infrastructure/operations responsibilities.

## Marketplace handoff foundation

Marketplace Preparation is private Vault state for future listing handoff. Current checks derive readiness from truthful Vault information such as:

- clear title;
- category;
- recorded condition;
- at least one actual-item photograph;
- buyer-facing description draft;
- condition disclosure.

`Marketplace Ready` means the Vault record contains the core truthful information needed to enter a later Marketplace listing workflow. It does not mean the item has been priced, listed, published, shipped, paid for, or sold.

## Great Hall integration

When the Vault service is available:

- Vault navigation becomes available at `/vault.html`;
- Great Hall collection overview uses real Vault statistics;
- quick actions include entering the Vault and adding a treasure.

If Vault wiring is unavailable, Great Hall falls back to an honest unavailable state rather than synthesizing collection data.

## The Keeper as Royal Curator

The Keeper remains one continuous character across the Kingdom. Inside the Vault his formal role is **Royal Curator**.

Authorized bounded context can include:

- aggregate Vault statistics;
- up to eight recent treasure summaries;
- up to eight query-grounded search matches;
- up to twelve flexible details per included treasure;
- up to three grounded tag recommendations per included treasure;
- up to six incomplete Collection Set summaries;
- up to five possible-duplicate groups with up to four sanitized records per group.

Certificate/reference strings are withheld from the general bounded attribute context. Set checklist graphs/source references and duplicate internal keys are withheld. Tag suggestions and duplicate groups are explicitly advisory.

The Keeper is instructed to:

- use only authorized context;
- never invent collection records or values;
- distinguish estimates and trust state from verified facts;
- prefer verification over guessing;
- help locate and organize treasures;
- recommend tags only from supplied grounded evidence;
- describe possible duplicates without merging/deleting them;
- preserve collector authority;
- never claim a collection mutation occurred unless Collector's Kingdom actually authorized and executed it.

The AI model never receives direct database authority.

## HTTP contract

Authenticated Vault endpoints currently include treasure CRUD, ownership history, flexible attributes, supporting evidence, images/media, Favorites, Saved Views, folders, locations, statistics, duplicate review, CSV import/export, collection sets, Marketplace readiness/preparation, category profiles, and grounded tag recommendations.

Representative routes include:

- `GET/POST /api/vault/treasures`
- `GET/PATCH/DELETE /api/vault/treasures/:id`
- `GET /api/vault/treasures/:id/history`
- `GET/POST /api/vault/treasures/:id/ownership`
- `GET/POST /api/vault/treasures/:id/attributes`
- `GET /api/vault/treasures/:id/tag-recommendations`
- `GET/POST /api/vault/treasures/:id/evidence`
- `POST /api/vault/treasures/:id/images`
- `GET /api/vault/media/:id`
- `GET/POST /api/vault/folders`
- `GET/POST /api/vault/locations`
- `GET /api/vault/stats`
- `GET /api/vault/duplicates`
- `GET/POST/PATCH/DELETE` collection-set routes as defined by the set HTTP service;
- `GET /api/vault/marketplace-ready`
- `GET/PATCH /api/vault/treasures/:id/marketplace-preparation`
- `POST /api/vault/import.csv`
- `GET /api/vault/export.csv`.

All protected domain calls derive collector identity from the signed session. Account IDs are never accepted from browser input as authorization parameters.

## Browser experience

The active Vault browser provides:

- white-marble / black / gold secure-vault visual identity;
- summary cards;
- natural search/filter/sort;
- Grid/List/Binder/Gallery modes;
- Saved Views and system views;
- nested folders and physical-location hierarchy;
- add/edit/delete treasure workflows;
- category-aware flexible-detail editor;
- grounded Royal Curator tag-suggestion section;
- Favorites;
- protected image/camera upload;
- supporting evidence;
- ownership/provenance timeline;
- explicit Collection Set checklist manager;
- possible-duplicate review;
- private Marketplace Preparation;
- preview-before-commit CSV import and CSV export;
- empty/loading/live-status states;
- persistent Royal Curator access.

## Accessibility and responsive architecture

Automated checks cover:

- document language/viewport;
- skip navigation;
- semantic search role;
- live status regions;
- explicit native-dialog accessible names;
- modal initial-focus and invoker-focus restoration behavior;
- keyboard-operable treasure cards;
- meaningful treasure-photo alternative text;
- visible focus including the visually wrapped file input;
- collection `aria-busy` state;
- reduced-motion support;
- forced-colors support;
- critical text-token contrast checks;
- responsive CSS boundaries.

Responsive layout breakpoints currently cover desktop/large tablet through 1250/1000/820/640px transitions, including workspace collapse, mobile dialogs/forms, top-bar adaptation, and smaller treasure layouts.

Automated checks do not substitute for actual screen-reader and physical-device acceptance. Those manual checks remain explicit pre-merge work in the IMP-005 acceptance record.

## Verification requirements

IMP-005 remains draft until automated and manual acceptance together cover the locked phase requirements.

Automated CI currently verifies persistence/restart, owner isolation, CRUD, category metadata, search, performance-index selection, organization protections, Favorites, Saved Views, view modes, sets, statistics, duplicate behavior, grounded recommendations, ownership history, media security, evidence integrity, recovery snapshot/restore, import/export, Great Hall/Keeper integration, Marketplace handoff boundaries, accessibility semantics, build artifact completeness, repository lint/type-contract/test/build gates, and production dependency audit.

See `docs/verification/IMP-005-ACCEPTANCE.md` for the current authoritative acceptance matrix and remaining manual work.
