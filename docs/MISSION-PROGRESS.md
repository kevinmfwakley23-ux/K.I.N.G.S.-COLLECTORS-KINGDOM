# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering ledger for K.I.N.G.S. Collector's Kingdom. Read it before substantial implementation work and update it after every major verified code batch so development can recover from the repository rather than depending on chat history.

## Progress rule

A progress entry must record what was actually implemented, important architecture changed, verification evidence, known limitations, and the exact next engineering target. Functionality is not called complete until it is real, wired, persistent/integrated where required, and supported by the strongest available quality gates.

---

## Current checkpoint

**Date:** 2026-09-05  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified checkpoint:** **Owner-authenticated cycle-safe collection/location reorganization PATCH API**  
**Latest verified code gate:** **Kingdom Quality Gates #433** — run `33964005746` — **PASS**  
**Verified code commit:** `bd0502f57d9bb333f2ea262c93d27e495cd45462`  
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
- append-only provenance/acquisition/ownership/custody/disposition history;
- a verified ordered browser bootstrap for transactional import, Intake Queue, scanner, and provenance enhancement modules;
- live owner-authenticated collection and physical-location reorganization PATCH APIs.

The reorganization HTTP surface is now real and production-wired. Collection rename/description edits preserve treasure membership and permanent treasure IDs. Location rename/type/notes/parent edits preserve descendant location IDs and treasure references. Location moves remain server-authoritative and reject self-parent, descendant-cycle, and cross-owner destination attempts. Unsupported HTTP mutation fields are rejected rather than ignored. No collection/location DELETE shortcut and no bulk move endpoint were added.

`/api/vault` reports individual reorganization availability while explicitly keeping `bulkMoveAvailable: false` and destructive bulk actions unavailable.

### Research completed before this pass

Pass-specific research record:

- `docs/research/2026-09-05-IMP-005-REORGANIZATION-PATCH-PASS.md`

Current competitor findings reinforced these design rules:

- iCollect uses explicit multi-selection and warns before shared bulk edits;
- Snipe-IT distinguishes omitted update fields from explicit blank values and keeps parent-location structure during updates;
- HomeBox users have specifically requested quick multi-select location movement rather than repetitive single-item editing.

Kingdom consequence: individual edits use explicit PATCH semantics now; future bulk movement must use explicit selected treasure UUIDs, a preview/review boundary, and the same authoritative destination validation rather than a second movement rule set.

### Exact next engineering target

**IMP-005 — Vault Reorganization: responsive individual edit controls**

Before that next code pass, re-check current competitor/UI patterns again as required by the repository research-before-build rule.

Build the next short slice in this order:

1. add responsive edit affordances to collection cards/items without removing filter/navigation behavior;
2. add explicit collection Edit → Save/Cancel controls for name and description;
3. add responsive edit affordances to physical-location rows;
4. add explicit location Edit → Save/Cancel controls for name, type, notes, and parent;
5. exclude the location itself and descendants from client parent choices where practical, while keeping the server as final cycle authority;
6. surface server cycle/ownership/validation errors directly rather than masking them;
7. after a successful PATCH, refresh authoritative snapshot/paths/counts from the server rather than inventing local success state;
8. keep permanent treasure UUIDs invisible to accidental replacement;
9. add browser-helper/static regression coverage where practical;
10. require the UI modules/artifacts in production gates if separated from `vault.js`;
11. pass full quality gates;
12. only then move to previewed atomic bulk treasure movement;
13. keep destructive bulk archive/delete out of the first bulk-move slice.

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

Verified real UPCitemdb adapter, local GS1 validation, production provider composition, bounded transport/rate handling, optional server-only paid key, authenticated UPC/EAN review, no treasure write during lookup, and explicit exclusion of provider price/offers/merchant/image data from the identification model.

### Provenance & Ownership Ledger

**Quality Gates #416** — run `33961966066` — **PASS**  
**Verified commit:** `cc3e6dd7e25f15e3aece341bc30cd44b238b69b7`

Verified append-only owner/treasure-scoped provenance events; acquisition/ownership/documentation/loan/disposition/loss/recovery/correction vocabulary; monetary validation; linked corrections; collector-recorded/non-verified truthfulness labeling; audit events; authenticated GET/HEAD+POST API; no ordinary PATCH/DELETE history mutation; export schema v2; and responsive saved-treasure timeline UI.

### Cycle-safe reorganization domain foundation

**Quality Gates #422** — run `33962143456` — **PASS**  
**Verified head:** `85989588939d06fdf6022e0bad2ba2f5b3fc1a00`

Verified repository/service logic for owner-scoped collection name/description updates and location parent/name/type/notes updates; unique collection names; self/descendant cycle rejection; cross-owner parent rejection; branch movement; descendant ID preservation; treasure UUID/reference preservation; path recalculation; structure-level audit events; and truthful no-op behavior.

### Live Vault enhancement bootstrap

**Quality Gates #425** — run `33963495455` — **PASS**  
**Verified head:** `34ca527c4f608d07290d43fa32fddacedc5df0f0`

Verified `apps/web/public/vault-extras.js` ordered loading of transactional import → Intake Queue → scanner → provenance, fail-stop behavior, and Vault-only bootstrap scheduling after core page initialization.

### Reorganization PATCH API — verified

**Quality Gates #433** — run `33964005746` — **PASS**  
**Verified head:** `bd0502f57d9bb333f2ea262c93d27e495cd45462`

Research:

- `docs/research/2026-09-05-IMP-005-REORGANIZATION-PATCH-PASS.md`

Implemented:

- `apps/web/vault-reorganization-http.mjs`;
- authenticated `PATCH /api/vault/collections/:id`;
- authenticated `PATCH /api/vault/locations/:id`;
- 16 KiB bounded JSON request body;
- JSON-object requirement;
- strict collection allowlist: `name`, `description`;
- strict location allowlist: `name`, `locationType`, `parentId`, `notes`;
- unsupported fields rejected with explicit error/details;
- empty updates rejected;
- omitted fields preserved by PATCH semantics;
- production composition of `reorganization-repository` + `reorganization-service`;
- route invoked ahead of generic Vault handling;
- `/api/vault` truthfully reports individual reorganization availability, cycle-safe reparent support, `bulkMoveAvailable: false`, and destructive bulk actions unavailable;
- type-contract requirements for repository/service/HTTP module;
- production-artifact requirements for repository/service/HTTP module.

HTTP regression verifies:

- unauthenticated edit rejection;
- collection rename/description update;
- permanent treasure UUID preserved;
- collection membership preserved;
- location branch rename/reparent;
- descendant path recalculation;
- permanent treasure location reference preserved;
- descendant-cycle request returns 409 `location_cycle`;
- cross-owner collection edit returns 404;
- unsupported mutation fields return 400;
- collection/location DELETE route is not exposed.

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
- `2026-09-05-IMP-005-REORGANIZATION-PATCH-PASS.md`

Research-before-build is a permanent repository rule: re-check current competitors/open-source patterns before each meaningful build pass and persist decisions that materially change implementation.

---

## Known unfinished IMP-005 work

Do not represent these as live until separately implemented and verified:

- collector-facing collection rename/edit controls;
- collector-facing physical-location rename/reparent controls;
- bulk treasure movement/reorganization preview + atomic commit;
- destructive bulk archive/delete flows;
- dedicated trading-card provider candidates;
- comic provider candidates;
- video-game-specific provider candidates;
- vinyl/music provider candidates;
- evidence-backed market valuation and value history;
- image recognition / visual collectible identification;
- saved searches/views and additional very-large-collection performance work;
- insurance/reporting outputs beyond JSON export;
- universal camera scanning on browsers without native `BarcodeDetector`;
- universal speech recognition on browsers without a Web Speech recognition implementation.

### Permanent truthfulness boundary

Market value stays absent/null until backed by real valuation evidence. A barcode, image, AI answer, external catalog candidate, title match, ISBN, catalog ID, receipt, certificate number, or collector-entered provenance statement is never silently upgraded into an authoritative independently verified claim. Permanent Kingdom treasure IDs remain provider-independent.
