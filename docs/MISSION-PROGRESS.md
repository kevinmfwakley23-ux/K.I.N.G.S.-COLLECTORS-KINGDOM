# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering ledger for K.I.N.G.S. Collector's Kingdom. Read it before substantial implementation work and update it after every major verified code batch so development can recover from the repository rather than depending on chat history.

## Progress rule

A progress entry must record what was actually implemented, important architecture changed, verification evidence, known limitations, and the exact next engineering target. Functionality is not called complete until it is real, wired, persistent/integrated where required, and supported by the strongest available quality gates.

---

## Current checkpoint

**Date:** 2026-09-05  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified checkpoint:** **Append-only Provenance & Ownership Ledger with responsive treasure timeline**  
**Latest verified code gate:** **Kingdom Quality Gates #416** — run `33961966066` — **PASS**  
**Verified code commit:** `cc3e6dd7e25f15e3aece341bc30cd44b238b69b7`  
**Default branch:** `main`

### Exact recovery point

Do **not** restart IMP-005.

The Royal Vault now has:

- permanent owner-scoped treasure UUIDs;
- collections and arbitrary-depth physical locations;
- searchable/filterable inventory;
- secure private media;
- JSON/CSV transactional migration;
- voice command/talk-to-text;
- persistent cross-device Intake Queue;
- progressive camera barcode scanning;
- review-only Open Library ISBN candidates;
- review-only UPCitemdb UPC/EAN/GTIN candidates;
- append-only provenance/acquisition/ownership/custody/disposition history.

Provider/catalog lookup never writes a treasure or market value. Provenance entries are explicitly collector-recorded evidence and return `independentlyVerified: false`. Corrections append a linked event instead of rewriting earlier history.

### Exact next engineering target

**IMP-005 — Vault Reorganization & Bulk Stewardship**

Research record:

- `docs/research/2026-09-05-IMP-005-VAULT-REORGANIZATION-BULK-RECON.md`

Build in this order:

1. owner-scoped collection rename/description update;
2. owner-scoped location rename/type/notes/parent update;
3. server-authoritative cycle prevention so a location cannot move beneath itself or any descendant;
4. preserve descendant nodes, treasure IDs, and treasure/location references when a branch moves;
5. authenticated PATCH APIs for collections and locations;
6. responsive individual edit controls;
7. bulk treasure reorganization preview for collection/location assignments;
8. atomic commit for selected treasure UUIDs with owner isolation and normal audit history;
9. no destructive bulk archive/delete in the first bulk-move slice;
10. full lint/contracts/tests/build/artifact/dependency verification before representing it as live.

A treasure's collection group or shelf/binder/safe may change, but its permanent Kingdom treasure UUID must not.

---

## Verified milestone history

### IMP-002 — Production-ready foundation

Verified runtime, config validation, health/readiness, structured logging, secure static serving, production build verification, CI, dependency audit, and architecture documentation.

Key commit: `963945881892ce3405da0187b7d2da9a71bc336f`

### IMP-003 — Persistent identity core

Verified persistent accounts/profiles, scrypt credentials, expiring server sessions, secure cookies, role foundation, identity audit events, auth APIs, and Royal Gate/account UI.

Key commit: `6fc42a088b07d02b1f64a3270bec5838cd272ea3`

### Shared K.I.N.G.S. AI boundary

Collector's Kingdom routes governed AI requests server-to-server through K.I.N.G.S. AI while retaining authority over identity, authorization, Vault records, ownership, Marketplace rules, and mutations. Model/provider credentials remain outside browser code.

Key commit: `e98674f6d5977e607db50695cbcc87f78b96e2f8`

### IMP-004 — Great Hall & Navigation

Verified authenticated Great Hall, permanent castle/grounds geography, Royal Vault, Kingdom Street Market, real recent activity, availability states, quick actions, room-aware Keeper roles, and responsive royal-estate UI.

Key commit: `8e5fd453e477997b9257977f8ace07e617e7fc7a`

---

## IMP-005 verified capability

### Authoritative Vault foundation

Verified:

- SQLite Vault persistence;
- owner-scoped treasure create/read/update/archive;
- permanent treasure UUIDs;
- collection groups;
- arbitrary-depth physical storage;
- condition, variant, quantity, acquisition, cost, identifiers, descriptions, notes, custom attributes;
- accent-tolerant normalized search;
- filters/sorting;
- candidate-only duplicate detection;
- treasure history;
- real record/unit/category statistics;
- purchase totals separated by currency;
- versioned portable export including archived records;
- authenticated HTTP APIs;
- Great Hall real counts;
- responsive Vault workspace;
- Royal Curator Keeper context.

Physical paths can represent structures such as:

`Vault Room → North Safe → Shelf 2 → Pokémon Binder → Page 7 → Pocket 4`

### Secure private media

Verified owner-scoped JPEG/PNG/WebP/GIF/AVIF/PDF storage outside the public webroot with generated storage keys, signature/MIME/extension validation, bounded sizes, authenticated retrieval/removal, audit events, and browser media UI.

Known limitation: no antivirus/sandbox/CDR service is claimed.

### Voice command and talk-to-text

Verified spoken navigation, Keeper questions, Vault search, safe treasure-entry commands, and field dictation where browser speech recognition exists. Typed controls remain available; destructive voice commands are excluded.

### Transactional JSON/CSV migration

**Quality Gates #328** — run `33958812569` — **PASS**.

Verified persistent preview batches, CSV mapping, validation/rejected/duplicate-review rows, explicit decisions, atomic all-or-nothing commit, stale-preview protection, idempotent retry, and no blind writes before commit.

### Royal Intake Queue

**Quality Gates #347** — run `33959303126` — **PASS**.

Verified server-side cross-device identifier capture, repeat-capture counts, dismissed history, owner isolation, existing-Vault warnings, safe editor prefill, audit events, and responsive UI.

### Progressive Royal barcode scanner

**Quality Gates #361** — run `33959932759` — **PASS** on `9ea1053ae6be2cb8ba79664ff7e88cb232ccdf97`.

Verified browser-native BarcodeDetector support discovery, rear-camera preference, explicit Start/Stop, secure-context requirement, debounce, authenticated Intake Queue writes, camera shutdown on leave/background, manual fallback, and least-privilege Vault-only camera permission.

### Review-only ISBN catalog candidates

**Quality Gates #379** — run `33960516422` — **PASS** on `62aa769353fc6fee1dc87850bb3390491c7d5b19`.

Verified Open Library ISBN checksum validation, bounded provider access/cache/rate handling, authenticated candidate API, provider/source evidence, explicit review semantics, and unsaved Book-editor prefill with no lookup-time Vault mutation.

### Review-only UPC/EAN/GTIN catalog candidates

**Quality Gates #396** — run `33961349239` — **PASS** on `3175e5f74f55c0dca4d72ed634b572128d032044`.

Verified:

- real UPCitemdb adapter;
- local GS1 check-digit validation for 8/12/13/14-digit retail identifiers;
- production Open Library + UPCitemdb provider composition;
- HTTPS-only external transport outside local testing;
- 10-second default serialized free-tier request interval;
- timeout/response-size/rate-limit handling;
- optional server-only paid key;
- authenticated UPC/EAN review action in Intake Queue;
- no automatic category assertion;
- no treasure write during lookup;
- explicit exclusion of provider price, offers, merchant links/domains, and provider images.

### Provenance & Ownership Ledger

**Quality Gates #416** — run `33961966066` — **PASS**  
**Verified commit:** `cc3e6dd7e25f15e3aece341bc30cd44b238b69b7`

Research:

- `docs/research/2026-09-05-IMP-005-PROVENANCE-OWNERSHIP-LEDGER-RECON.md`

Implemented:

- `vault_provenance_events` persistence table tied to permanent treasure UUIDs;
- immutable event IDs;
- owner/treasure scoped repository;
- repository intentionally exposes no ordinary update/remove/delete methods;
- controlled event vocabulary for acquisition, ownership notes, documentation, loan/custody, sale/gift/trade, loss/stolen/recovery, and correction;
- effective-date validation;
- optional counterparty, method, reference, evidence URL, and notes;
- monetary transaction facts as integer cents + explicit three-letter currency;
- amount/currency consistency checks;
- same-owner/same-treasure correction target validation;
- collector-recorded evidence class and `independentlyVerified: false` on every public event;
- normal Vault audit event `vault.provenance_appended` for each append;
- authenticated treasure-scoped GET/HEAD + POST API;
- PATCH and DELETE intentionally unavailable;
- 16 KiB provenance request limit;
- provenance capability policy in `/api/vault`;
- Vault export schema version 2 when provenance is active, including portable `provenanceEvents`;
- responsive saved-treasure provenance entry/timeline UI;
- provenance panel hidden for unsaved drafts so history attaches only to permanent treasure IDs;
- linked correction selector;
- source evidence links;
- exact decimal-to-integer-cents browser parsing;
- production artifact/type-contract requirements.

Verification covers:

- owner isolation;
- cross-treasure correction rejection;
- archive survival;
- monetary validation;
- append-only repository/API semantics;
- correction linkage;
- audit linkage;
- export v2;
- browser timeline helper behavior;
- full previous Kingdom regression suite;
- production build/artifact verification;
- production dependency audit.

Gate #415 initially failed only because the strict repository anti-fake-code lint treated the literal browser hint-property spelling as a forbidden marker. The UI helper was rewritten without weakening the rule; #416 then passed the complete suite.

---

## Research records

Important IMP-005 research under `docs/research/`:

- `2026-09-05-IMP-005-VAULT-COMPETITIVE-RECON.md`
- `2026-09-05-IMP-005-VAULT-MEDIA-SECURITY.md`
- `2026-09-05-IMP-005-INTAKE-IMPORT-SCANNER-RECON.md`
- `2026-09-05-IMP-005-CATALOG-CANDIDATE-RECON.md`
- `2026-09-05-IMP-005-UPC-EAN-CATALOG-PROVIDER.md`
- `2026-09-05-IMP-005-PROVENANCE-OWNERSHIP-LEDGER-RECON.md`
- `2026-09-05-IMP-005-VAULT-REORGANIZATION-BULK-RECON.md`

Research-before-build remains a permanent repository rule.

---

## Known unfinished IMP-005 work

Do not represent these as live until separately implemented and verified:

- collection rename/edit workflows;
- physical-location rename/reparent/reorganization;
- bulk treasure movement/reorganization;
- destructive bulk archive/delete flows;
- dedicated trading-card provider candidates;
- comic provider candidates;
- video-game-specific provider candidates;
- vinyl/music provider candidates;
- evidence-backed market valuation and value history;
- image recognition / visual collectible identification;
- saved searches/views and additional very-large-collection performance work;
- insurance/reporting outputs beyond JSON export;
- universal camera scanning on browsers without native BarcodeDetector;
- universal speech recognition on browsers without a Web Speech recognition implementation.

### Permanent truthfulness boundary

Market value stays absent/null until backed by real valuation evidence. A barcode, image, AI answer, external catalog candidate, title match, ISBN, catalog ID, receipt, certificate number, or collector-entered provenance statement is never silently upgraded into an authoritative independently verified claim. Permanent Kingdom treasure IDs remain provider-independent.
