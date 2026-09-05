# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering ledger for K.I.N.G.S. Collector's Kingdom.

Its purpose is to make the current build state recoverable even if a chat session, local environment, or development thread is lost. It must be updated after every substantial implementation commit or verified milestone.

## Progress-update rule

After every major body of code or meaningful milestone commit, update this file with:

1. the milestone or mission identifier;
2. what was actually implemented;
3. the important files or architectural boundaries changed;
4. the verification that was performed;
5. known limitations or unfinished work;
6. the exact next validated engineering target.

Do not mark functionality complete unless it is real, wired, persistent/integrated where required, and supported by the strongest available verification gates.

The repository README should always contain the short current-status summary. This file contains the detailed durable history.

---

## Current checkpoint

**Date:** 2026-09-05  
**Current product milestone:** **IMP-005 — Royal Vault, Phase 1 — active**  
**Latest verified Vault checkpoint:** **Authoritative persistence/API/browser foundation with normalized search**  
**Previous completed product milestone:** **IMP-004 — Great Hall & Navigation**  
**Repository default branch:** `main`

### Exact recovery point

Do **not** restart IMP-005 from the beginning.

The Royal Vault now has a real owner-scoped persistent domain, authenticated APIs, Great Hall integration, and a functional responsive browser workspace. Treasure records use permanent Collector's Kingdom UUIDs and survive independently of future catalog, Marketplace, grading, valuation, legacy, or AI providers.

The verified Vault foundation currently includes real treasure create/read/update/archive behavior, collection groups, arbitrary-depth physical storage locations, condition/variant/acquisition data, extensible identifiers and custom attributes, owner-scoped search/filter/sort, normalized accent-tolerant search, candidate-only duplicate detection, treasure change history, real collection statistics, currency-separated purchase-cost totals, complete JSON export including archived records, non-mutating import validation, and The Keeper as Royal Curator.

The Vault is now injected into the production Great Hall service. When the authoritative service is wired, Great Hall navigation marks the Vault `available`, links to `/vault.html`, and reports real Vault record/unit counts instead of placeholder totals.

The **next validated engineering target** is to continue IMP-005 by implementing the secure Vault media pipeline and then the transactional validated import/bulk-intake commit path. Camera/barcode recognition, external catalog adapters, evidence-backed market valuation, and other later intelligence capabilities remain unimplemented and must not be represented as live.

---

## Verified / implemented milestone history

### IMP-002 — Production-ready Kingdom foundation

**Status:** Implemented and committed.

Implemented:

- executable Node.js runtime;
- configuration validation;
- health and readiness endpoints;
- structured logging;
- secure static serving;
- production build verification;
- CI workflow;
- dependency audit and Dependabot foundation;
- architecture documentation.

Key commit: `963945881892ce3405da0187b7d2da9a71bc336f`

---

### IMP-003 — Persistent identity core

**Status:** Core implemented and committed; advanced identity hardening remains future work.

Implemented:

- persistent accounts and profiles;
- scrypt credential hashing;
- server-side expiring sessions;
- secure session cookies;
- role enforcement foundation;
- identity audit events;
- authentication APIs;
- functional Royal Gate / account UI.

Known future identity work:

- account recovery;
- email verification completion flows;
- MFA;
- trusted devices;
- notification and abuse-control hardening;
- production-scale storage evolution when required.

Key commit: `6fc42a088b07d02b1f64a3270bec5838cd272ea3`

---

### Shared K.I.N.G.S. AI application boundary

**Status:** Implemented and committed.

Implemented:

- Collector's Kingdom routes AI requests server-to-server through the governed K.I.N.G.S. AI app-router contract;
- model/provider credentials remain owned by K.I.N.G.S. AI rather than browser code;
- Collector's Kingdom retains authority over identity, authorization, Vault records, Marketplace rules, ownership, and product actions;
- The Keeper can use the shared intelligence boundary without being allowed to silently execute product mutations.

Key commit: `e98674f6d5977e607db50695cbcc87f78b96e2f8`

---

### IMP-004 — Great Hall & Navigation

**Status:** Implemented and committed.

Implemented:

- authenticated personalized Great Hall;
- permanent castle-and-grounds geography;
- castle-room navigation;
- Kingdom Street Market positioned outside the castle;
- real recent identity activity from the audit trail;
- honest staged-service availability states;
- quick actions;
- conversational search / Keeper entry point;
- persistent room-aware Keeper presence;
- The Keeper's role changes by location, including Royal Host, Royal Curator, and Royal Trade Advisor;
- Royal Vault entrance and visual environment;
- Kingdom Street Market entrance and visual environment;
- responsive mobile, tablet, Chromebook, and desktop behavior foundation;
- competitive-research-before-build governance;
- regression coverage and production assets.

Important rule preserved:

Collection totals, marketplace highlights, notifications, Vault inventory, and other domain values are not fabricated before their authoritative services exist.

Key commit: `8e5fd453e477997b9257977f8ace07e617e7fc7a`

---

### Deployment / ecosystem wiring after IMP-004

**Status:** Implemented in subsequent commits.

Recent deployment commits:

- `a799a02d086fe89301669e9ae1941d58f14dbae4` — Add Render deployment blueprint.
- `762cfc640e6628005eabf50490f5170c79ac3f81` — Support Render private K.I.N.G.S. router host.
- `4d91753d3b98c93bc02650a30bd906cf1fd78a67` — Test Render private K.I.N.G.S. router config.
- `8374d16a779415f5f7687c66ed8b99f0566d3193` — Use unified ecosystem Render blueprint.

---

## Active mission — IMP-005: Royal Vault, Phase 1

### Mission purpose

Build the first real authoritative collection-management domain in Collector's Kingdom.

The Royal Vault is not a decorative inventory screen. It is the durable identity and record system for the collector's treasures. A treasure created in the Vault must keep the same authoritative identity when it is later used by Marketplace, grading, transfer, legacy, insurance, valuation, provenance, or other Kingdom services.

### Locked Phase 1 capability targets

The first Vault milestone must establish real implementations for:

- authoritative treasure identity;
- treasure create, read, update, and archive/delete behavior;
- collector ownership and authorization boundaries;
- collections / grouping;
- broad collectible categories plus extensible custom types;
- search;
- filters;
- sorting;
- condition and variant information;
- media / image attachment foundation;
- collection statistics based only on real Vault records;
- duplicate-detection foundation;
- import/export foundation;
- physical storage location tracking;
- audit/history foundation for treasure changes;
- Royal Curator context for The Keeper;
- responsive Royal Vault UI consistent with the white-marble, black-and-gold royal estate identity.

### Physical-location model direction

The Vault supports arbitrary-depth real-world storage rather than a single free-text location field. Current tested examples include:

`Vault Room → North Safe → Shelf 2 → Pokémon Binder → Page 7 → Pocket 4`

The architecture supports room, vault, safe, cabinet, display case, shelf, binder, page, pocket, box, row, divider, and custom location nodes.

### Competitive engineering priorities for IMP-005

Research and improve on current collector platforms in these areas:

- fast item intake;
- barcode / camera / recognition workflows where appropriate;
- large-collection search and filtering;
- exact variant and condition handling;
- duplicate detection;
- custom collection types;
- physical inventory location;
- import/export and collector data ownership;
- provenance and acquisition history;
- evidence-backed value data architecture;
- insurance/documentation readiness;
- cross-device usability;
- privacy and security;
- accessibility;
- bulk operations;
- AI assistance that surfaces uncertainty instead of confidently inventing matches.

Competitive ideas must be implemented as Kingdom-native solutions and must not copy incompatible source code or proprietary visual design.

### Current IMP-005 status

Implemented and verified in the current foundation:

- Vault-specific SQLite persistence boundary under `packages/vault/`;
- permanent treasure UUIDs;
- owner-scoped collection, location, treasure, history, stats, duplicate, export, and import-preview behavior;
- treasure CRUD with archive semantics instead of ordinary destructive deletion;
- arbitrary-depth hierarchical physical locations with computed human-readable paths;
- structured title/category/manufacturer/series/variant/condition/acquisition/cost fields;
- provider-agnostic external identifiers and extensible custom attributes;
- normalized accent-tolerant search across meaningful treasure data;
- server-side search/filter/sort;
- candidate-only duplicate detection using external-identifier and normalized-content fingerprints;
- real record/unit/category statistics;
- recorded purchase-cost totals separated by currency rather than misleadingly combined;
- treasure change history;
- complete versioned JSON export including archived records;
- bounded validation-only JSON import preview that writes nothing;
- authenticated Vault HTTP APIs;
- Great Hall integration using real Vault counts;
- functional `/vault.html` workspace for collections, locations, treasures, search, editing, archiving, duplicate review, export, and import validation;
- Royal Curator Keeper context;
- responsive Vault styling;
- production build and artifact verification aware of the Vault package/page.

Not yet complete in IMP-005:

- secure binary image/document upload, retrieval, lifecycle, and storage implementation;
- media UI tied to real stored files (metadata schema exists only);
- transactional import commit after successful preview;
- bulk create/update/archive operations;
- camera/barcode scanner workflow;
- image recognition / external catalog candidate adapters;
- evidence-backed market valuation feeds and valuation history;
- edit/reorganization workflows for existing collection groups and location nodes;
- saved views/filters and additional large-collection performance work;
- insurance/reporting outputs beyond portable JSON export.

---

## Progress entries

### 2026-09-05 — IMP-005 progress: authoritative Vault foundation and browser workspace

**Status:** **VERIFIED FOUNDATION — IMP-005 remains in progress**  
**Latest verified code commit:** `9fb1815402fc0b23103dde6d22fe26e10aec54f5`  
**GitHub Actions:** Kingdom Quality Gates run `33953011873` / run #286 — verify job **PASS**

Research completed:

- Fresh Vault-specific competitor and technical reconnaissance was recorded in `docs/research/2026-09-05-IMP-005-VAULT-COMPETITIVE-RECON.md`.
- Research covered current collection tracker workflows plus HomeBox, Snipe-IT, HomeAsset, and Grocy architecture patterns.
- Key adopted improvements: permanent treasure identity, owner isolation, archive semantics, hierarchical storage, portable data, audit history, flexible attributes, uncertainty-aware duplicates, and provider-independent identifiers.

Implemented:

- `packages/vault/src/sqlite-store.mjs` — persistent collections, nested storage locations, treasures, media metadata schema, treasure events, statistics, duplicate candidate queries, export, and normalized search storage.
- `packages/vault/src/service.mjs` — owner-scoped validation and domain rules for collections, locations, treasures, duplicate review, history, stats, export, and non-mutating import preview.
- `apps/web/server.mjs` — authenticated Vault APIs, Vault persistence startup/shutdown, production Great Hall injection, Vault error handling, and a separately bounded larger request size for import preview only.
- `packages/great-hall/src/service.mjs` — opens the Vault only when the authoritative service is actually wired, adds real Vault counts, and preserves the no-fake-market-value rule.
- `apps/web/public/vault.html`, `vault.js`, and `vault.css` — usable responsive Royal Vault workspace with real APIs rather than sample inventory.
- `tests/vault.test.mjs` and `tests/vault-server.test.mjs` — persistence, hierarchy, search, ownership isolation, statistics, API, Great Hall integration, import/export, archive, duplicate, and history coverage.
- `tools/typecheck.mjs`, `tools/build.mjs`, and `tools/verify-build.mjs` — Vault package and production artifacts are now part of repository quality gates.

Important defects found and corrected during verification:

1. Recorded purchase costs were initially summarized into one total. That was corrected so currencies are reported separately and USD/EUR values are never silently added together.
2. The first full CI run exposed that SQLite `LIKE` search for `pokemon` did not match `Pokémon`. The Vault now maintains normalized diacritic-insensitive search text so ordinary collector searches are more forgiving without weakening exact stored data.
3. Import preview advertised up to 1,000 records while the default JSON parser capped requests at 64 KiB. The import-preview route now has its own bounded 1 MiB limit while ordinary JSON APIs retain the tighter 64 KiB limit.
4. Production initialization initially created the Great Hall before injecting the Vault service. Startup now creates the Vault service first and passes it to Great Hall, and the integration test verifies `/api/navigation` exposes `/vault.html` only when the real service exists.

Verification evidence:

- Repository lint / placeholder-policy gate — **PASS**.
- Module contract/type boundary gate — **PASS**.
- Automated test suite — **PASS** after normalized-search fix.
- Production build — **PASS**.
- Production artifact verification — **PASS**.
- Production dependency audit — **PASS**, 0 vulnerabilities reported by the quality run.
- GitHub Actions quality gate run #286 (`33953011873`) — verify job **SUCCESS**.

Known limitations remain explicit:

- `vault_treasure_media` establishes the persistence boundary, but no binary file is yet accepted or claimed as stored.
- Import preview validates but intentionally cannot commit records yet.
- Barcode values may be entered as identifiers, but camera/barcode scanning is not yet implemented.
- No external recognition/catalog provider is currently claimed as connected.
- No market value is shown as authoritative; estimated value remains `null` until evidence-backed valuation services exist.
- No Marketplace mutation can originate from Vault records yet; that remains a later approved phase.

**Exact next target:** Continue IMP-005 with a secure owner-scoped media pipeline for treasure images/documents (validated MIME/type/size, safe storage keys, retrieval authorization, deletion/lifecycle, tests, and Vault UI), then build a transactional import-commit/bulk-intake path that only writes records which passed validation and duplicate review.

---

## Current known architecture

- Runtime: Node.js ES modules.
- Persistence foundation: SQLite via `node:sqlite` for current server-side persistent services.
- Identity authority: `packages/identity`.
- Great Hall / navigation authority: `packages/great-hall`.
- Vault authority: `packages/vault`.
- Shared AI boundary: `packages/kings-ai`.
- Web runtime: `apps/web/server.mjs` and static web assets under `apps/web/public`.
- Verification entry point: `npm run verify`.

The Vault owns treasure records, collection grouping, physical storage locations, treasure history, Vault search/index behavior, and Vault-specific validation. It does not own model-provider routing.

---

## Verification standard

The repository's current full verification command is:

```bash
npm ci
npm run verify
```

`npm run verify` currently runs lint/policy checks, module-contract checks, automated tests, production build, and artifact verification.

GitHub Actions is the required remote quality gate before a milestone is treated as fully verified.

When a future milestone changes the verification system, record the new commands here.

---

## Next progress entry template

Copy and complete this section after the next major implementation commit:

### YYYY-MM-DD — IMP-005 progress: <short title>

**Commit:** `<sha>`  
**Status:** In progress / Verified / Blocked

Implemented:

- ...

Architecture changed:

- ...

Verification:

- `npm run ...` — PASS/FAIL
- GitHub Actions — PASS/FAIL/PENDING

Known limitations:

- ...

**Exact next target:** ...
