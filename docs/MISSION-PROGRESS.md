# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering ledger for K.I.N.G.S. Collector's Kingdom. Read it before substantial implementation work and update it after every major verified code batch so development can recover from the repository rather than depending on chat history.

## Progress rule

A progress entry must record what was actually implemented, the important architecture changed, verification evidence, known limitations, and the exact next engineering target. Functionality is not called complete until it is real, wired, persistent/integrated where required, and supported by the strongest available quality gates.

---

## Current checkpoint

**Date:** 2026-09-05  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified checkpoint:** **Review-only ISBN + UPC/EAN/GTIN external catalog candidate resolution through the Royal Intake Queue**  
**Latest verified code gate:** **Kingdom Quality Gates #396** — run `33961349239` — **PASS**  
**Verified code commit:** `3175e5f74f55c0dca4d72ed634b572128d032044`  
**Default branch:** `main`

### Exact recovery point

Do **not** restart IMP-005.

The Royal Vault now has a real owner-scoped collection domain, secure media, transactional migration/import, voice/talk-to-text, a cross-device Intake Queue, progressive camera barcode scanning, and two real external catalog-evidence paths:

- Open Library for checksum-valid ISBN candidates;
- UPCitemdb for checksum-valid UPC/EAN/GTIN retail candidates.

Both are provider-neutral **review-only evidence**. The authenticated catalog route performs no Vault mutation. Candidate metadata is copied only into a new unsaved treasure editor, permanent Kingdom treasure UUIDs remain independent of provider IDs, and UPCitemdb price/offer/merchant/image fields are deliberately excluded from the identification model.

### Exact next engineering target

**IMP-005 — Provenance & Ownership Ledger**

Research record:

- `docs/research/2026-09-05-IMP-005-PROVENANCE-OWNERSHIP-LEDGER-RECON.md`

Build an owner-scoped, append-oriented lifecycle ledger tied to permanent treasure UUIDs. The first verified slice should:

1. add durable provenance/lifecycle event storage with immutable event IDs;
2. keep collector-entered evidence explicitly distinct from independent verification;
3. validate event types, dates, optional counterparties/sources/references, notes, and monetary transaction facts;
4. keep monetary amounts in integer cents + currency and never combine currencies without exchange-rate evidence;
5. support acquisition, supporting-document/provenance notes, custody/loan, disposition/sale/gift/trade, loss/recovery, and explicit correction events through a controlled stable vocabulary;
6. make corrections append a new event referencing the prior event instead of silently rewriting history;
7. enforce owner/treasure isolation and reject cross-owner references;
8. expose authenticated treasure-scoped append/list APIs with no ordinary destructive delete route;
9. include provenance events in portable Vault export;
10. add a responsive treasure provenance timeline/editor after the domain/API is proven;
11. write audit events for provenance additions;
12. pass full quality gates before representing the ledger as live.

This layer is groundwork for later insurance, inheritance/legacy, Marketplace transfer, profit/loss, fraud review and valuation evidence. It is not a government title registry and must not claim that collector-entered provenance is independently authenticated.

---

## Verified milestone history

### IMP-002 — Production-ready Kingdom foundation

Implemented and verified:

- executable Node.js runtime;
- configuration validation;
- health/readiness endpoints;
- structured logging;
- secure static serving;
- production build verification;
- CI workflow and dependency audit;
- architecture documentation.

Key commit: `963945881892ce3405da0187b7d2da9a71bc336f`

### IMP-003 — Persistent identity core

Implemented and verified core:

- persistent accounts/profiles;
- scrypt credential hashing;
- server-side expiring sessions;
- secure session cookies;
- collector/admin role foundation;
- identity audit events;
- authentication APIs;
- Royal Gate/account UI.

Advanced recovery, verification, MFA, trusted-device, and abuse-control work remains later identity hardening.

Key commit: `6fc42a088b07d02b1f64a3270bec5838cd272ea3`

### Shared K.I.N.G.S. AI application boundary

Implemented:

- Collector's Kingdom routes governed AI requests server-to-server through K.I.N.G.S. AI;
- model/provider credentials stay outside browser code;
- Collector's Kingdom retains authority over identity, authorization, Vault records, ownership, Marketplace rules, and product actions;
- The Keeper may advise but does not silently execute ownership/destructive mutations.

Key commit: `e98674f6d5977e607db50695cbcc87f78b96e2f8`

### IMP-004 — Great Hall & Navigation

Implemented and verified:

- authenticated personalized Great Hall;
- permanent castle-and-grounds geography;
- Royal Vault inside the castle;
- Kingdom Street Market outside the castle;
- real recent identity activity;
- honest staged-service states;
- quick actions;
- room-aware Keeper roles;
- responsive mobile/tablet/Chromebook/desktop royal-estate UI.

Key commit: `8e5fd453e477997b9257977f8ace07e617e7fc7a`

---

## Active mission — IMP-005: Royal Vault, Phase 1

### Authoritative Vault foundation — verified

Current verified capabilities include:

- SQLite Vault persistence boundary under `packages/vault/`;
- permanent owner-scoped treasure UUIDs;
- treasure create/read/update/archive;
- collection groups;
- arbitrary-depth physical storage locations;
- condition, variant, quantity, acquisition, purchase cost, identifiers, descriptions, notes, and custom attributes;
- normalized accent-tolerant search;
- filters and sorting;
- candidate-only duplicate detection;
- treasure change history;
- real record/unit/category statistics;
- purchase totals separated by currency;
- complete versioned JSON export including archived records;
- authenticated Vault HTTP APIs;
- Great Hall real Vault counts;
- responsive `/vault.html` workspace;
- Royal Curator Keeper context.

Physical-location model supports paths such as:

`Vault Room → North Safe → Shelf 2 → Pokémon Binder → Page 7 → Pocket 4`

### Secure private treasure media — verified

- owner-scoped media metadata repository;
- private filesystem storage outside public webroot;
- generated storage keys unrelated to user filenames;
- JPEG, PNG, WebP, GIF, AVIF, and PDF allowlist;
- signature + declared MIME + extension agreement checks;
- unsafe path/name rejection;
- bounded file/account limits;
- authenticated list/read/remove;
- private/no-store retrieval;
- media add/remove audit events;
- browser upload/gallery/download/remove UI.

Known limitation: no antivirus/sandbox/CDR pipeline is currently claimed. Media validation is structural/type/authorization/storage hardening, not malware scanning.

### Kingdom voice command and talk-to-text — verified

- reusable browser speech controller;
- standard/prefixed SpeechRecognition where supported;
- local recognition preference where the browser reports an available local pack;
- same-origin microphone policy;
- navigation, Keeper, Vault search, and safe `add treasure` voice commands;
- dictation for Vault/Great Hall/treasure/Keeper fields;
- destructive voice commands intentionally excluded;
- full typed fallback when recognition is unavailable.

### Transactional JSON/CSV migration — verified

Quality Gates #328 (`33958812569`) verified:

- JSON and CSV intake in the responsive Vault;
- CSV parsing and collector-controlled field mapping;
- persistent server-side preview batches;
- row validation and duplicate-review states;
- explicit import/skip decisions;
- atomic all-or-nothing commit;
- stale-preview/duplicate protection;
- idempotency keys for safe retries;
- recoverable review state;
- production artifacts and parser/mapping tests.

No blind import writes occur before explicit commit.

### Royal Intake Queue — verified

Quality Gates #347 (`33959303126`) verified:

- account-scoped persistent intake queue;
- manual UPC/EAN/ISBN/catalog/serial/SKU/custom identifier capture;
- repeated pending captures merge into one item with a capture count;
- dismissed history is preserved;
- owner isolation on list/dismiss;
- authenticated Intake API;
- responsive phone/desktop queue UI;
- one-click identifier prefill into a new treasure editor while queue state remains explicit;
- existing Vault identifier candidates surfaced as warnings only;
- arbitrary provider-specific external identifier keys safely ignored during queue matching;
- intake audit events;
- production artifact/contract verification.

### Secure progressive Royal barcode scanner — verified

Quality Gates #361 (`33959932759`) on commit `9ea1053ae6be2cb8ba79664ff7e88cb232ccdf97` verified:

- browser-native `BarcodeDetector` only when exposed by the browser;
- supported-format discovery;
- environment-facing camera preference;
- explicit Start/Stop;
- secure-context requirement;
- repeated-frame debounce;
- camera detections written through the authenticated Intake Queue;
- no automatic treasure creation/catalog identity claim;
- camera track shutdown on Stop, page leave, or backgrounding;
- scanner load sequenced after Intake Queue initialization;
- manual fallback on unsupported browsers;
- Vault-only `camera=(self)` permission while other Kingdom pages/APIs retain `camera=()`.

Native `BarcodeDetector` remains limited across browsers, so camera scanning is progressive rather than mandatory.

### Review-only ISBN catalog candidates — verified

**Quality Gates #379** — run `33960516422` — **PASS**  
**Verified head:** `62aa769353fc6fee1dc87850bb3390491c7d5b19`

Research record:

- `docs/research/2026-09-05-IMP-005-CATALOG-CANDIDATE-RECON.md`

Implemented:

- bounded in-process evidence cache;
- real Open Library ISBN adapter;
- provider-neutral candidate aggregation/service;
- authenticated review-only candidate endpoint;
- runtime provider URL/timeout/cache/rate/contact configuration;
- ISBN checksum validation before network use;
- bounded provider responses and malformed-payload rejection;
- candidate source/provider/match reason;
- no lookup-time Vault mutation;
- review-only copy into an unsaved Book editor;
- explicit provider-unavailable states;
- full lint/test/build/artifact/dependency verification.

### Review-only UPC/EAN/GTIN catalog candidates — verified

**Quality Gates #396** — run `33961349239` — **PASS**  
**Verified head:** `3175e5f74f55c0dca4d72ed634b572128d032044`

Research record:

- `docs/research/2026-09-05-IMP-005-UPC-EAN-CATALOG-PROVIDER.md`

Implemented architecture:

- `packages/catalog/src/upcitemdb-provider.mjs` — real UPCitemdb retail-code adapter;
- `packages/catalog/src/runtime.mjs` — production composition of Open Library + UPCitemdb behind one catalog service;
- `apps/web/public/vault-catalog-core.js` — browser review policy and safe candidate→unsaved-draft mapping;
- UPCitemdb runtime settings for base URL, optional server-only paid key, timeout and minimum request interval;
- UPC/EAN candidate review actions on pending Royal Intake Queue rows;
- build/type contracts requiring the provider/runtime/browser-core artifacts;
- HTTP regression covering review-only UPC responses and unchanged Vault count.

UPC/EAN safeguards:

- local GS1 check-digit validation for 8-, 12-, 13- and 14-digit identifiers before outbound use;
- arbitrary QR/Code128/serial/custom scanner data is not sent merely because it is a barcode;
- HTTPS-only external transport outside localhost testing;
- free-plan default 10-second serialized request interval;
- default 5-second timeout;
- protected 256 KiB response ceiling;
- provider rate-limit headers parsed and HTTP 429 surfaced explicitly;
- free `/prod/trial/lookup` and optional paid `/prod/v1/lookup` support;
- paid key remains server-side;
- allowlisted product metadata only;
- provider prices, offers, merchant links/domains and provider images excluded from normalized candidates;
- category is left for collector confirmation rather than asserted from a provider category string;
- no current-value/purchase-price/trade-value mutation;
- no automatic treasure creation;
- no lookup-time Vault mutation;
- collector must explicitly save the unsaved editor.

Quality Gates #396 verified the complete integrated path: provider/runtime composition, UI draft safety, authenticated HTTP review semantics, unchanged Vault record count, lint, module contracts, tests, production build, required production artifacts, and production dependency audit.

---

## Research records

Meaningful engineering research is stored under `docs/research/`.

Important IMP-005 records include:

- `2026-09-05-IMP-005-VAULT-COMPETITIVE-RECON.md` — collector competitors and open-source inventory patterns;
- `2026-09-05-IMP-005-VAULT-MEDIA-SECURITY.md` — upload/media security design;
- `2026-09-05-IMP-005-INTAKE-IMPORT-SCANNER-RECON.md` — CSV mapping, bulk intake, scan queues, and browser scanner direction;
- `2026-09-05-IMP-005-CATALOG-CANDIDATE-RECON.md` — Open Library usage/rate guidance and candidate-resolution architecture;
- `2026-09-05-IMP-005-UPC-EAN-CATALOG-PROVIDER.md` — UPCitemdb limits, data boundaries and retail-code adapter decisions;
- `2026-09-05-IMP-005-PROVENANCE-OWNERSHIP-LEDGER-RECON.md` — acquisition/provenance/lifecycle research and next ledger design.

Research-before-build remains a permanent repository rule.

---

## Known unfinished IMP-005 work

Do not represent these as live until separately implemented and verified:

- structured provenance/acquisition/ownership/disposition timeline;
- dedicated trading-card provider candidates;
- comic provider candidates;
- video-game provider candidates;
- vinyl/music provider candidates;
- evidence-backed market valuation feeds and valuation history;
- image recognition / visual collectible identification;
- bulk update/archive/reorganization workflows;
- edit/reorganization workflows for collection groups and physical location nodes;
- saved searches/views and additional very-large-collection search performance work;
- insurance/reporting outputs beyond portable JSON export;
- universal camera scanning on browsers without native `BarcodeDetector`;
- universal speech recognition on browsers without a Web Speech recognition implementation.

### Permanent truthfulness boundary

Market value stays absent/null until backed by real evidence. A barcode, image, AI answer, external provider candidate, title match, ISBN match, catalog ID, receipt, certificate number, or collector-entered provenance statement is never silently upgraded into an authoritative independently verified claim. Permanent Kingdom treasure IDs remain provider-independent.
