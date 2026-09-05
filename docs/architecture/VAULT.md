# IMP-005 — Royal Vault Phase 1 Architecture

## Status

Active implementation of the locked IMP-005 Vault (Phase 1) milestone.

The locked Construction Documents remain the authority. This architecture implements the Phase-1 Vault without claiming later Vision, Marketplace, synchronization, grading, insurance, or external valuation systems are complete.

## Domain authority

The Royal Vault is the authoritative home for collectible records owned by the authenticated collector.

The Vault owns:

- treasure records;
- collection folders;
- physical storage locations;
- tags;
- attached Vault media metadata and files;
- collection statistics;
- duplicate-candidate detection;
- Vault audit history;
- structured ownership history;
- CSV export;
- bounded authorized Vault context supplied to The Keeper.

The Vault does not own:

- authentication or sessions;
- AI provider/model routing;
- Marketplace transactions;
- external valuation-source ingestion;
- future Vision identification;
- future synchronization conflict resolution.

Those remain behind their approved Kingdom boundaries.

## Persistence

Phase 1 uses Node's SQLite runtime and filesystem media storage under the configured Kingdom data directory.

Persistent stores:

- `identity.sqlite` — identity/session boundary;
- `vault.sqlite` — Vault domain records and ownership history;
- `media/vault/` — authenticated Vault image bytes.

SQLite is an implementation detail behind service contracts. Browser code and The Keeper do not access database files directly.

The schema is designed so a future storage provider can replace the implementation without changing the Vault HTTP/product contract.

## Treasure record

A Phase-1 treasure supports:

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
- collection folder;
- physical storage location;
- multiple protected images;
- edit/audit history;
- structured ownership history.

Estimated value is explicitly treated as evidence-bearing estimate data. It is never presented as guaranteed sale proceeds.

## Organization model

### Collection folders

Folders answer conceptual questions such as:

- Which collection does this belong to?
- Which project/set/group should show it together?

Folders may be nested.

### Physical locations

Physical locations answer:

- Where is the actual object?

Locations may be nested and currently support:

- room;
- safe;
- cabinet;
- display case;
- shelf;
- binder;
- page;
- pocket;
- box;
- row;
- divider;
- container;
- other.

A realistic path may therefore be:

`Collection Room → Fireproof Safe → Shelf B → Baseball Box → Row 2`

Folders and physical locations intentionally remain separate.

## Search

Vault search uses a SQLite FTS5 index over:

- title;
- category;
- series;
- manufacturer;
- notes;
- tags.

Additional structured filters operate on category, folder, physical location, and tag. Sorting supports title, creation/update time, year, and recorded estimated value.

The browser does not download the entire Vault merely to search it.

## Duplicate detection

Phase-1 duplicate detection is conservative.

A normalized duplicate key currently uses:

- title;
- category;
- series;
- manufacturer;
- year.

Matching keys create a **possible duplicate group**. The system never auto-merges or deletes records because condition, provenance, edition, variant, certification, or intentional duplicate ownership may make both records correct.

Future Vision/catalog integrations can improve duplicate confidence without changing this safety rule.

## Media security

Vault images:

- require an authenticated collector;
- require ownership of the parent treasure;
- are limited to approved image MIME types;
- are size limited;
- are stored outside the public static directory;
- receive a SHA-256 digest;
- are retrieved only through owner-scoped Vault API routes.

The browser's `capture="environment"` input is real camera/photo intake. It is not represented as AI identification.

## Ownership history vs audit history

These are separate concepts.

### Vault audit history

Records system/domain events such as:

- treasure created;
- treasure updated;
- image added;
- treasure deleted.

### Ownership history

Records the collectible's human ownership/provenance timeline, including:

- acquired;
- inherited;
- gifted in;
- transferred in;
- sold;
- gifted out;
- transferred out;
- other.

Keeping them separate protects both operational accountability and collectible provenance.

## Great Hall integration

When the Vault service is available:

- the Vault navigation entry changes from `planned` to `available`;
- its route becomes `/vault.html`;
- the Great Hall collection overview uses real Vault statistics;
- quick actions include entering the Vault and adding a treasure.

If the service is unavailable, Great Hall returns to an honest unavailable state rather than synthesizing collection totals.

## The Keeper as Royal Curator

The Keeper remains one continuous character across the Kingdom.

Inside the Vault his role is **Royal Curator**.

Collector's Kingdom supplies a bounded context containing:

- aggregate Vault statistics;
- a small set of recently updated treasure summaries;
- recorded physical location names;
- recorded value evidence fields.

The Keeper is instructed to:

- use only authorized context;
- never invent collection records or values;
- distinguish estimates from facts;
- prefer verification over guessing;
- help locate and organize treasures;
- preserve collector authority;
- never claim a collection mutation occurred unless Collector's Kingdom actually authorized and executed it.

The AI model never receives direct database authority.

## HTTP contract

Authenticated Vault endpoints include:

- `GET /api/vault/treasures`
- `POST /api/vault/treasures`
- `GET /api/vault/treasures/:id`
- `PATCH /api/vault/treasures/:id`
- `DELETE /api/vault/treasures/:id`
- `GET /api/vault/treasures/:id/history`
- `GET /api/vault/treasures/:id/ownership`
- `POST /api/vault/treasures/:id/ownership`
- `DELETE /api/vault/treasures/:id/ownership/:eventId`
- `POST /api/vault/treasures/:id/images`
- `GET /api/vault/media/:id`
- `GET/POST /api/vault/folders`
- `DELETE /api/vault/folders/:id`
- `GET/POST /api/vault/locations`
- `DELETE /api/vault/locations/:id`
- `GET /api/vault/stats`
- `GET /api/vault/duplicates`
- `GET /api/vault/export.csv`

All protected domain calls derive the collector from the signed session. Account IDs are not accepted from the browser as authorization parameters.

## Readiness

During IMP-005, application readiness requires:

- configuration;
- identity service;
- Vault treasure service;
- Vault ownership-history service.

Health remains a liveness signal; readiness fails closed if required Vault wiring is absent.

## Browser experience

The Phase-1 Vault browser provides:

- secure-vault visual identity consistent with white marble, black detail, and gold veining;
- collection summary cards;
- search/filter/sort;
- grid/list views;
- folders;
- physical location hierarchy;
- add/edit/delete treasure workflows;
- detail view;
- image/camera uploads;
- duplicate review;
- CSV export;
- empty/loading/status states;
- persistent Royal Curator access.

The interface prioritizes viewing and locating treasures over data-entry density.

## Verification requirements

IMP-005 is not complete until automated and remote verification cover:

- real SQLite persistence;
- process/store restart recovery;
- authentication and owner isolation;
- CRUD;
- search/filter/sort;
- folder/location hierarchy protections;
- statistics;
- duplicate candidate behavior;
- ownership history;
- media persistence and authorization;
- export;
- Great Hall integration;
- bounded Keeper context;
- build artifact completeness;
- repository lint/type-contract/test/build gates;
- production dependency audit.
