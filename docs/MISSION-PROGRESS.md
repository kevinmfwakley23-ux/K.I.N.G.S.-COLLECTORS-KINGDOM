# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering ledger for K.I.N.G.S. Collector's Kingdom. Read it before substantial implementation work and update it after every major verified code batch so development can recover from the repository rather than depending on chat history.

## Progress rule

A progress entry must record what was actually implemented, the important architecture changed, verification evidence, known limitations, and the exact next engineering target. Functionality is not called complete until it is real, wired, persistent/integrated where required, and supported by the strongest available quality gates.

---

## Current checkpoint

**Date:** 2026-09-05  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified checkpoint:** **Review-only ISBN catalog candidate resolution through the Royal Intake Queue**  
**Latest verified code gate:** **Kingdom Quality Gates #379** — run `33960516422` — **PASS**  
**Verified code commit:** `62aa769353fc6fee1dc87850bb3390491c7d5b19`  
**Default branch:** `main`

### Exact recovery point

Do **not** restart IMP-005.

The Royal Vault now has a real owner-scoped collection domain, secure media, migration/import, voice/talk-to-text, a cross-device Intake Queue, progressive camera barcode scanning, and the first real external catalog-evidence provider. Pending ISBN captures can request Open Library candidates, inspect source evidence, and copy selected metadata into a **new unsaved treasure editor**. Lookup itself never creates, updates, merges, archives, values, or otherwise mutates authoritative Vault records.

Permanent Kingdom treasure UUIDs remain independent of Open Library or any future provider IDs.

### Exact next engineering target

**IMP-005 — Broader identifier candidate coverage, first safe UPC/EAN slice**

Research confirms UPCitemdb currently exposes a no-signup free lookup tier for UPC/EAN/GTIN/ISBN data, but that free tier is tightly bounded and provider terms disclaim accuracy. Before representing UPC/EAN candidate lookup as live, the next slice must:

1. preserve the provider-neutral catalog contract already verified;
2. record current UPCitemdb terms/rate limitations in `docs/research/`;
3. use lookup-only, review-only semantics;
4. enforce a conservative free-tier request interval and provider rate headers;
5. cache public evidence to reduce traffic;
6. never redistribute restricted merchant/offer data as Kingdom valuation evidence;
7. normalize only safe product metadata and source references;
8. return provider-unavailable/rate-limited states honestly;
9. expose candidates only for supported UPC/EAN/general barcode intake rows;
10. require explicit collector review in the treasure editor before any Vault save;
11. pass full quality gates before the provider is described as live.

PriceCharting is also relevant for later game/collectible pricing, but its current API is paid/subscription-token based and has strict call limits. It must remain a separately configured future evidence/valuation adapter rather than being implied as available now.

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

Implemented architecture:

- `packages/catalog/src/cache.mjs` — bounded in-process evidence cache;
- `packages/catalog/src/open-library-provider.mjs` — real Open Library ISBN adapter;
- `packages/catalog/src/service.mjs` — provider-neutral candidate aggregation/normalization;
- `apps/web/catalog-http.mjs` — authenticated review-only candidate endpoint;
- runtime settings for provider URL, timeout, cache TTL/size, conservative request interval, and optional contact identity;
- production startup wiring with provider credentials/config retained server-side;
- ISBN lookup action on pending Royal Intake Queue cards;
- candidate source/provider/match-reason UI;
- review-only copy into a new unsaved Book treasure editor;
- author, first-publication year, provider record, and source evidence copied only into the unsaved editor for collector review;
- no lookup-time Vault mutation;
- provider/service-unavailable states fail closed.

Open Library safeguards:

- ISBN-10/ISBN-13 checksum validation before network use;
- HTTPS-only external provider transport outside local testing;
- default 5-second timeout with AbortController;
- conservative serialized request interval;
- optional configured contact email in the application User-Agent, never hard-coded/invented;
- bounded 256 KiB provider response;
- malformed JSON/payload rejection;
- maximum five provider results per Open Library lookup;
- provider results cached for six hours by default with a 500-entry bound;
- exact ISBN query still produces **candidates**, because provider/source ambiguity can exist;
- no bulk/high-traffic Open Library use is designed or claimed.

Verification covers:

- ISBN checksum validation;
- normalized provider candidate evidence;
- no-match honesty;
- oversized/malformed provider response rejection;
- caching and expiry;
- unsupported identifier/provider outage errors;
- authenticated HTTP route;
- explicit proof that treasure count remains unchanged after lookup;
- runtime HTTPS/contact/resource-limit validation;
- catalog modules in type-contract verification;
- catalog server/package files in production artifact verification;
- complete lint/tests/build/dependency audit.

Important defect caught by CI during this slice:

- the established runtime-default deep-equality test initially failed because new catalog runtime settings were not added to its expected contract. The test was updated rather than weakened; the subsequent full gate passed.

---

## Research records

Meaningful engineering research is stored under `docs/research/`.

Important IMP-005 records include:

- `2026-09-05-IMP-005-VAULT-COMPETITIVE-RECON.md` — collector competitors and open-source inventory patterns;
- `2026-09-05-IMP-005-VAULT-MEDIA-SECURITY.md` — upload/media security design;
- `2026-09-05-IMP-005-INTAKE-IMPORT-SCANNER-RECON.md` — CSV mapping, bulk intake, scan queues, and browser scanner direction;
- `2026-09-05-IMP-005-CATALOG-CANDIDATE-RECON.md` — Open Library usage/rate guidance and candidate-resolution architecture.

Research-before-build remains a permanent repository rule.

---

## Known unfinished IMP-005 work

Do not represent these as live until separately implemented and verified:

- UPC/EAN/general retail barcode external candidates beyond existing Vault-record matching;
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

Market value stays absent/null until backed by real evidence. A barcode, image, AI answer, external provider candidate, title match, ISBN match, or catalog ID is never silently upgraded into an authoritative exact-item claim. Permanent Kingdom treasure IDs remain provider-independent.
