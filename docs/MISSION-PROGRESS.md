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
**Latest verified Vault checkpoint:** **Secure private treasure media + Kingdom voice command/dictation capability**  
**Previous completed product milestone:** **IMP-004 — Great Hall & Navigation**  
**Repository default branch:** `main`

### Exact recovery point

Do **not** restart IMP-005 from the beginning.

The Royal Vault has a real owner-scoped persistent domain, authenticated APIs, Great Hall integration, a functional responsive browser workspace, secure private treasure media, and a progressive Kingdom-wide voice layer. Treasure records use permanent Collector's Kingdom UUIDs and survive independently of future catalog, Marketplace, grading, valuation, legacy, or AI providers.

Verified Vault capability now includes:

- treasure create/read/update/archive;
- collection groups;
- arbitrary-depth physical storage locations;
- condition, variant, quantity, acquisition, cost, identifiers, and custom attributes;
- owner-scoped normalized accent-tolerant search/filter/sort;
- candidate-only duplicate detection;
- treasure change history;
- real collection statistics;
- currency-separated purchase-cost totals;
- complete versioned JSON export including archived records;
- validation-only import preview;
- authenticated Royal Vault APIs and browser workspace;
- secure owner-scoped private images and PDF documents stored outside the public webroot;
- file signature, declared MIME type, extension, filename, size, ownership, and storage-limit validation for media;
- authenticated media listing/retrieval/removal and media audit events;
- same-origin-only microphone policy;
- voice commands for Kingdom navigation, Keeper control/questions, search, and safe treasure intake;
- speech-to-text dictation controls in Great Hall search, Keeper messages, Vault search, treasure title/description/condition notes/collector notes, and Keeper messages;
- destructive voice mutations intentionally excluded from the executable voice grammar;
- typed controls preserved when browser speech recognition is unavailable.

The **next validated engineering target** is the transactional import/bulk-intake path: preview, duplicate review, explicit commit, all-or-nothing persistence, auditability, and safe bulk creation. Camera/barcode recognition, external catalog adapters, evidence-backed market valuation, and other later intelligence capabilities remain unimplemented and must not be represented as live.

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

Implemented and verified:

- Vault-specific SQLite persistence boundary under `packages/vault/`;
- permanent treasure UUIDs;
- owner-scoped collection, location, treasure, history, stats, duplicate, export, import-preview, and media behavior;
- treasure CRUD with archive semantics instead of ordinary destructive deletion;
- arbitrary-depth hierarchical physical locations with computed human-readable paths;
- structured title/category/manufacturer/series/variant/condition/acquisition/cost fields;
- provider-agnostic external identifiers and extensible custom attributes;
- normalized accent-tolerant search across meaningful treasure data;
- server-side search/filter/sort;
- candidate-only duplicate detection using external-identifier and normalized-content fingerprints;
- real record/unit/category statistics;
- recorded purchase-cost totals separated by currency rather than misleadingly combined;
- treasure and media audit history;
- complete versioned JSON export including archived records;
- bounded validation-only JSON import preview that writes nothing;
- authenticated Vault HTTP APIs;
- Great Hall integration using real Vault counts;
- functional `/vault.html` workspace for collections, locations, treasures, search, editing, archiving, duplicate review, export, import validation, and private media;
- secure private media storage outside the public webroot using generated storage keys;
- validated JPEG, PNG, WebP, GIF, AVIF, and PDF media ingestion;
- media ownership isolation, authenticated retrieval, deletion, storage limits, and audit events;
- same-origin browser microphone permission with camera still disabled;
- progressive `SpeechRecognition` / prefixed speech recognition support where the browser implements it;
- Kingdom-wide voice command grammar for safe navigation/Keeper/search/intake actions;
- targeted voice dictation controls rather than uncontrolled always-on microphone capture;
- Royal Curator Keeper context;
- responsive Vault and voice styling;
- production build and artifact verification aware of Vault, media, and voice files.

Not yet complete in IMP-005:

- transactional import commit after successful preview;
- bulk create/update/archive operations;
- camera/barcode scanner workflow;
- image recognition / external catalog candidate adapters;
- evidence-backed market valuation feeds and valuation history;
- edit/reorganization workflows for existing collection groups and location nodes;
- saved views/filters and additional large-collection performance work;
- insurance/reporting outputs beyond portable JSON export;
- universal speech recognition on browsers that do not expose the Web Speech recognition interface.

---

## Progress entries

### 2026-09-05 — IMP-005 progress: authoritative Vault foundation and browser workspace

**Status:** **VERIFIED FOUNDATION — IMP-005 remains in progress**  
**GitHub Actions:** Kingdom Quality Gates run `33953011873` / run #286 — verify job **PASS**

Research completed:

- Fresh Vault-specific competitor and technical reconnaissance was recorded in `docs/research/2026-09-05-IMP-005-VAULT-COMPETITIVE-RECON.md`.
- Research covered current collection tracker workflows plus HomeBox, Snipe-IT, HomeAsset, and Grocy architecture patterns.
- Key adopted improvements: permanent treasure identity, owner isolation, archive semantics, hierarchical storage, portable data, audit history, flexible attributes, uncertainty-aware duplicates, and provider-independent identifiers.

Implemented:

- persistent collections, nested storage locations, treasures, media metadata schema, treasure events, statistics, duplicate candidate queries, export, and normalized search storage;
- owner-scoped service validation and domain rules;
- authenticated Vault APIs;
- real Great Hall Vault integration;
- functional responsive Royal Vault browser workspace;
- automated persistence/API/ownership/search/history/import/export/duplicate/statistics tests;
- Vault-aware module, build, and artifact quality gates.

Important defects found and corrected during verification:

1. Recorded purchase costs were initially summarized into one total. That was corrected so currencies are reported separately and USD/EUR values are never silently added together.
2. The first full CI run exposed that SQLite `LIKE` search for `pokemon` did not match `Pokémon`. The Vault now maintains normalized diacritic-insensitive search text.
3. Import preview advertised up to 1,000 records while the default JSON parser capped requests at 64 KiB. The import-preview route now has its own bounded 1 MiB limit while ordinary JSON APIs retain the tighter 64 KiB limit.
4. Production initialization initially created the Great Hall before injecting the Vault service. Startup now injects the real Vault before Great Hall navigation is considered available.

Verification:

- repository lint/policy — **PASS**;
- module contract/type boundary — **PASS**;
- automated tests — **PASS**;
- production build — **PASS**;
- production artifact verification — **PASS**;
- production dependency audit — **PASS**.

---

### 2026-09-05 — IMP-005 progress: secure private media and Kingdom voice control

**Status:** **VERIFIED — IMP-005 remains in progress**  
**Latest verified code commit:** `4584539453dc7585556b037b3186e1e124e86481`  
**GitHub Actions:** Kingdom Quality Gates run `33956000131` / run #309 — verify job **PASS**

Implemented — secure media:

- `packages/vault/src/media-repository.mjs` for owner-scoped media metadata persistence;
- `packages/vault/src/media-storage.mjs` for private filesystem storage under the Kingdom data directory rather than the public webroot;
- generated storage keys using hashed owner/treasure segments and random media UUIDs;
- `packages/vault/src/media-service.mjs` for file inspection, storage quotas, owner authorization, audit events, read/list/remove workflows, and storage lifecycle;
- allowlisted JPEG, PNG, WebP, GIF, AVIF, and PDF files;
- signature-based content detection plus declared MIME-type and extension agreement checks;
- unsafe filename/path rejection;
- 12 MiB image and 20 MiB PDF limits, 24 media files per treasure, and a bounded account media allowance;
- SVG and unsupported/script-capable file formats rejected rather than served as trusted images;
- `apps/web/vault-media-http.mjs` authenticated binary upload/list/read/delete HTTP boundary;
- private no-store retrieval headers and same-origin resource policy;
- Royal Vault media upload/gallery/download/remove UI for saved treasure records;
- media add/remove audit events with stored SHA-256 evidence for added files;
- `/api/vault` now reports media as available only when the real media service is wired.

Implemented — voice command / speech-to-text:

- reusable `apps/web/public/voice.js` controller;
- standard `SpeechRecognition` plus `webkitSpeechRecognition` fallback where exposed by the browser;
- on-device recognition preference when the browser reports a local language pack as available;
- same-origin microphone permission via `Permissions-Policy: microphone=(self)`;
- `on-device-speech-recognition=(self)` permission for supporting browsers;
- camera remains explicitly disabled until the scanner milestone;
- Great Hall voice command button and search dictation;
- voice commands across Kingdom locations;
- Royal Vault voice search and spoken `add treasure` command;
- dictation for treasure title, description, condition notes, collector notes, Vault search, and Keeper message fields;
- spoken Keeper questions such as `ask the Keeper ...` routed through the existing governed K.I.N.G.S. AI boundary;
- commands for Great Hall, Vault, Marketplace, Library, Observatory, War Room, Treasury, Workshop, Hall of Legacy, and Royal Chambers navigation;
- destructive phrases such as archive/delete/sell/buy/transfer are intentionally not executable voice commands;
- unsupported browsers hide microphone controls and retain complete typed functionality.

Verification added:

- `tests/voice.test.mjs` verifies voice grammar, safe dictation insertion, and destructive-command exclusion;
- `tests/vault-media.test.mjs` verifies private storage, ownership isolation, retrieval/deletion, audit events, and rejection of spoofed/unsafe/unsupported files;
- `tests/vault-server.test.mjs` verifies authenticated media HTTP behavior plus same-origin microphone and disabled-camera policy;
- `tools/typecheck.mjs` now requires voice/media module contracts;
- `tools/verify-build.mjs` now requires voice/media production artifacts.

Verification evidence:

- Kingdom Quality Gates #308 — **PASS** for the full voice/media integration and security tests;
- consistency correction made so `/api/vault` no longer falsely reports uploads unavailable;
- Kingdom Quality Gates #309 (`33956000131`) — **PASS** after the consistency correction;
- production dependency audit — **PASS**.

Known limitations:

- Web Speech recognition is not implemented uniformly by all browsers, so voice remains progressive enhancement with typed fallback;
- browser/vendor speech services may process recognition remotely when local recognition is unavailable; the Kingdom itself does not receive raw microphone audio through these browser speech controls;
- camera access remains disabled and no camera/barcode scanner is claimed as implemented;
- current private media storage is local server filesystem storage under `KINGDOM_DATA_DIR`; production multi-instance/object-storage evolution remains a future scale milestone;
- PDF documents are served as attachments rather than trusted inline active content;
- transactional bulk import is still validation-only and cannot yet commit records.

**Exact next target:** Build transactional import/bulk intake with preview tokens, duplicate review, explicit user commit, owner-scoped all-or-nothing persistence, audit evidence, retry/idempotency protection, and Vault UI review/commit controls.

---

## Current known architecture

- Runtime: Node.js ES modules.
- Persistence foundation: SQLite via `node:sqlite` for current server-side persistent services.
- Identity authority: `packages/identity`.
- Great Hall / navigation authority: `packages/great-hall`.
- Vault authority: `packages/vault`.
- Vault private media: `packages/vault/src/media-*` + `apps/web/vault-media-http.mjs`.
- Shared browser voice layer: `apps/web/public/voice.js`.
- Shared AI boundary: `packages/kings-ai`.
- Web runtime: `apps/web/server.mjs` and static web assets under `apps/web/public`.
- Verification entry point: `npm run verify`.

The Vault owns treasure records, collection grouping, physical storage locations, treasure/media history, Vault search/index behavior, and Vault-specific validation. It does not own model-provider routing.

Voice commands may initiate only approved low-risk UI/navigation/search/Keeper actions. Destructive product mutations remain controlled by explicit product workflows rather than speech-recognition guesses.

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
