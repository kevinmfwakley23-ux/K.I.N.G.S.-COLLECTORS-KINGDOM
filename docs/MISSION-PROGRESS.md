# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering ledger for K.I.N.G.S. Collector's Kingdom. Read it before substantial implementation work and update it after every major verified code batch so development can recover from the repository rather than depending on chat history.

## Progress rule

A progress entry must record what was actually implemented, the important architecture changed, verification evidence, known limitations, and the exact next engineering target. Functionality is not called complete until it is wired, real, persistent/integrated where required, and supported by the strongest available quality gates.

---

## Current checkpoint

**Date:** 2026-09-05  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified checkpoint:** **Secure progressive Royal barcode scanner on the cross-device Royal Intake Queue**  
**Latest verified code gate:** **Kingdom Quality Gates #361** — run `33959932759` — **PASS**  
**Verified code commit:** `9ea1053ae6be2cb8ba79664ff7e88cb232ccdf97`  
**Default branch:** `main`

### Exact recovery point

Do **not** restart IMP-005.

The Royal Vault is now a real owner-scoped collection system with durable treasure identities, hierarchical physical storage, search/filter/sort, duplicate candidates, history, secure private media, portable export, transactional JSON/CSV migration, Kingdom voice/talk-to-text, a persistent cross-device Royal Intake Queue, and a progressive camera barcode scanner that feeds that same queue.

The scanner is intentionally an **evidence-capture tool**, not an automatic identification authority. A camera detection stores the observed identifier and barcode format in the collector's queue. It does not create a treasure, merge records, invent metadata, or claim that a barcode proves an exact collectible variant.

The **next validated engineering target** is **evidence-backed catalog candidate resolution**:

1. establish a provider-neutral catalog-candidate contract owned by Collector's Kingdom;
2. resolve supported identifiers only on explicit collector action;
3. start with a real low-volume ISBN provider adapter suitable for human lookup;
4. include source/provider identity, retrieval time, evidence URL/identifier, candidate confidence/reasoning, and raw-provider reference without making the provider ID the permanent treasure ID;
5. use bounded timeout, caching, rate awareness, and honest provider-unavailable states;
6. let the collector review/apply candidate metadata to a treasure editor rather than silently writing authoritative Vault data;
7. preserve the existing manual workflow when no provider supports an identifier.

Open Library is a candidate first ISBN evidence provider because its current API documentation supports low-volume real-time book discovery/lookup. Its own usage guidance says it is not intended to be a third-party bulk/high-traffic backend, so any adapter must remain replaceable and must follow caching, request-identification, and rate guidance. Broader UPC/EAN/comics/cards/games/catalog adapters will require separate provider research and licensing/credential decisions.

---

## Verified product history

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
- role foundation;
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

### Verified authoritative Vault foundation

- SQLite Vault persistence boundary under `packages/vault/`;
- permanent owner-scoped treasure UUIDs;
- treasure create/read/update/archive;
- collection groups;
- arbitrary-depth physical storage locations;
- condition, variant, quantity, acquisition, purchase-cost, identifiers, descriptions, notes, and custom attributes;
- normalized accent-tolerant search;
- filter/sort;
- candidate-only duplicate detection;
- treasure change history;
- real record/unit/category statistics;
- purchase totals separated by currency;
- complete versioned JSON export including archived records;
- authenticated Vault HTTP APIs;
- Great Hall real Vault counts;
- responsive `/vault.html` workspace;
- Royal Curator Keeper context.

Physical-location example supported by the model:

`Vault Room → North Safe → Shelf 2 → Pokémon Binder → Page 7 → Pocket 4`

### Secure private treasure media — verified

- owner-scoped media metadata repository;
- private filesystem storage outside public webroot;
- generated storage keys unrelated to user filenames;
- JPEG, PNG, WebP, GIF, AVIF, and PDF allowlist;
- signature + declared MIME + extension agreement checks;
- unsafe path/name rejection;
- bounded image/PDF/account limits;
- authenticated list/read/remove;
- private/no-store retrieval;
- media add/remove audit events;
- browser upload/gallery/download/remove UI.

Latest media/voice verified checkpoint previously passed Quality Gates #309 (`33956000131`).

Known media limitation: no antivirus/sandbox/CDR pipeline is currently claimed. PDF/media validation is structural/type/authorization/storage hardening, not malware scanning.

### Kingdom voice command and talk-to-text — verified

- reusable browser speech controller;
- standard/prefixed SpeechRecognition where supported;
- local recognition preference where browser reports an available local pack;
- same-origin microphone policy;
- navigation, Keeper, Vault search, and safe `add treasure` voice commands;
- dictation for Vault/Great Hall/treasure/Keeper fields;
- destructive voice commands intentionally excluded;
- full typed fallback on unsupported browsers.

### Transactional JSON/CSV migration — verified

Latest transactional import UI checkpoint passed Quality Gates #328 (`33958812569`).

Implemented:

- JSON and CSV intake in the responsive Vault;
- CSV header parsing and collector-controlled field mapping;
- persistent server-side preview batches;
- row validation and duplicate-review states;
- explicit import/skip decisions;
- all-or-nothing transaction semantics;
- stale-preview/duplicate protection;
- idempotency keys for safe commit retry;
- recoverable browser review state;
- production artifact requirements and parser/mapping tests.

No blind import writes occur before explicit commit.

### Royal Intake Queue — verified

Latest complete Queue checkpoint passed Quality Gates #347 (`33959303126`) on commit `58c60d605e107bdaeeaa5300b1de0c3fea164cfb`.

Implemented:

- account-scoped persistent intake queue in the Vault database;
- manual UPC/EAN/ISBN/catalog/serial/SKU/custom identifier capture;
- repeated pending captures merge into one queue item with a capture count;
- dismissed items remain in history rather than being destructively erased;
- owner isolation on list/dismiss operations;
- authenticated intake API;
- responsive phone/desktop Vault queue UI;
- one-click identifier prefill into a new treasure editor while keeping queue state explicit;
- existing Vault identifier candidates surfaced as warnings only;
- provider-specific unknown treasure identifier keys safely ignored during queue matching;
- intake audit events;
- production artifact and contract verification.

### Secure progressive Royal barcode scanner — verified

**Quality Gates #361** — run `33959932759` — **PASS**  
**Verified head commit:** `9ea1053ae6be2cb8ba79664ff7e88cb232ccdf97`

Implemented:

- `apps/web/public/vault-scanner-core.js` for format normalization, preferred-format selection, detection validation, debounce rules, and support-state logic;
- `apps/web/public/vault-scanner-ui.js` for explicit camera start/stop, supported-format discovery, live preview, detection, queue persistence, and shutdown lifecycle;
- `apps/web/public/vault-scanner.css` responsive scanner presentation;
- browser-native `BarcodeDetector` only when actually exposed by the browser;
- `BarcodeDetector.getSupportedFormats()` discovery rather than assuming formats;
- rear/environment-facing camera preference;
- secure-context requirement;
- 1.5-second repeated-frame debounce to prevent one stationary barcode from flooding the queue;
- detected format mapped to UPC/EAN/general barcode evidence without asserting exact catalog identity;
- every accepted detection written through the existing authenticated Royal Intake Queue API;
- scanner stops tracks when the collector presses Stop, leaves the page, or backgrounds the Kingdom;
- scanner load is sequenced after the Intake Queue UI to avoid a module timing race;
- manual intake remains fully available when camera, media devices, or native barcode detection are unsupported.

Security/permission design:

- ordinary Kingdom pages and JSON APIs retain `camera=()`;
- only `/vault.html` receives `Permissions-Policy: camera=(self)`;
- microphone remains same-origin;
- geolocation remains disabled;
- camera access still requires a browser permission prompt and a secure browser context;
- the app never starts the camera automatically.

Verification added:

- scanner core tests for barcode-format mapping;
- unsafe/empty detection rejection;
- preferred-format selection;
- repeated-frame debounce;
- secure-context/media-device/native-detector support states;
- server integration proof that `/vault.html` has camera permission while Great Hall/API responses remain camera-blocked;
- production type-contract and artifact gates require scanner core/UI/CSS files.

Current browser limitation: native `BarcodeDetector` remains limited/experimental across browsers. This is why camera scanning is progressive rather than required. Manual Intake Queue entry is the universal fallback.

---

## Research records

Meaningful engineering research is stored under `docs/research/`.

Important IMP-005 records include:

- `2026-09-05-IMP-005-VAULT-COMPETITIVE-RECON.md` — collector competitors and open-source inventory patterns;
- `2026-09-05-IMP-005-VAULT-MEDIA-SECURITY.md` — upload/media security design;
- `2026-09-05-IMP-005-INTAKE-IMPORT-SCANNER-RECON.md` — CSV mapping, bulk intake, scan queues, and browser scanner direction.

Research-before-build remains a permanent repository rule.

---

## Known unfinished IMP-005 work

Do not represent these as live until separately implemented and verified:

- external catalog candidate adapters beyond existing Vault-record matching;
- evidence-backed market valuation feeds and valuation history;
- image recognition / visual collectible identification;
- broad UPC/EAN/comic/card/game provider coverage;
- bulk update/archive/reorganization workflows;
- edit/reorganization workflows for collection groups and physical location nodes;
- saved searches/views and additional very-large-collection search performance work;
- insurance/reporting outputs beyond portable JSON export;
- universal camera barcode scanning on browsers without native `BarcodeDetector`;
- universal speech recognition on browsers without a Web Speech recognition implementation.

### Permanent truthfulness boundary

Market value stays absent/null until backed by real evidence. A barcode, image, AI answer, provider candidate, or matching title is never silently upgraded into an authoritative exact-item claim. Permanent Kingdom treasure IDs remain provider-independent.

---

## Exact next engineering target

**IMP-005 — Catalog Candidate Resolution, first verified slice**

Build a real low-volume identifier-resolution path that improves intake without weakening collector authority:

- provider-neutral catalog candidate types and service boundary;
- cache with bounded TTL and owner-independent safe public lookup reuse where licensing permits;
- strict outbound timeout and bounded payload handling;
- provider source/evidence metadata;
- real ISBN lookup adapter with current provider usage requirements honored;
- normalized candidate output for title, author/manufacturer/publisher, edition/date/identifiers where evidence exists;
- no mutation during lookup;
- collector review/apply UI from Intake Queue to treasure editor;
- tests for provider failure, malformed data, timeout, no-match, candidate match, cache behavior, and no-write semantics;
- production build/artifact verification;
- then research and add additional collectible-domain providers only when their APIs, licensing, authentication, and evidence quality are acceptable.
