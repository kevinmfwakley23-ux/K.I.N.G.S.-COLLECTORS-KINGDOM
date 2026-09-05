# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering ledger for K.I.N.G.S. Collector's Kingdom. Read it before substantial implementation work and update it after every major verified code batch so development can recover from the repository rather than depending on chat history.

## Progress rule

A progress entry must record what was actually implemented, the important architecture changed, verification evidence, known limitations, and the exact next engineering target. Functionality is not called complete until it is wired, real, and supported by the strongest available quality gates.

---

## Current checkpoint

**Date:** 2026-09-05  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified checkpoint:** **Transactional JSON/CSV import review + secure media + Kingdom voice**  
**Latest verified code gate:** **Kingdom Quality Gates #328** — run `33958812569` — **PASS**  
**Verified code commit:** `0bd7c528757441d5add443544640233c17a81835`  
**Default branch:** `main`

### Exact recovery point

Do **not** restart IMP-005.

The Royal Vault is now a real owner-scoped collection domain with persistent treasure identity, authenticated APIs, a responsive browser workspace, secure private media, voice command/talk-to-text support, and transactional bulk migration.

The latest verified intake/import system includes:

- direct JSON import;
- direct CSV import in the responsive Vault;
- CSV header inference and explicit field mapping;
- preservation of unmapped useful columns as custom attributes when the collector chooses;
- server-side review batches that survive a page refresh;
- two-hour preview expiry;
- validation without writes;
- duplicate detection against existing Vault treasures;
- duplicate detection within the incoming batch;
- explicit **Import** or **Skip** decisions for duplicate-review rows;
- rejected rows forced to skip instead of being silently written;
- pre-commit revalidation;
- stale-new-duplicate detection before commit;
- owner isolation for import batches;
- idempotency keys so a retry cannot duplicate a committed batch;
- one SQLite transaction for all selected treasure/event writes;
- proven full rollback when a later row fails mid-transaction;
- provenance events linking imported treasures to source batch and source row;
- browser-session recovery of an unfinished review batch;
- responsive review/mapping UI and production-artifact enforcement.

The **next validated engineering target** is the **Royal Intake Queue**: persistent owner-scoped rapid identifier capture that can begin on a phone and be reviewed on Chromebook/desktop, followed by a progressive secure barcode-camera scanner with manual fallback. Barcode/image capture must produce evidence/candidates, not silently assert exact collectible identity.

Camera access remains intentionally disabled until that real scanner is implemented and verified. External catalog adapters, image recognition, evidence-backed valuation, and Marketplace mutations are also not yet claimed as live.

---

## Verified capability inventory

### IMP-002 — Production foundation

Implemented:

- executable Node.js production runtime;
- validated runtime configuration;
- health/readiness endpoints;
- structured logging;
- secure static serving and security headers;
- CI workflow;
- dependency auditing;
- production build/artifact verification;
- architecture documentation.

Representative commit: `963945881892ce3405da0187b7d2da9a71bc336f`

### IMP-003 — Identity core

Implemented:

- persistent accounts/profiles;
- scrypt credential hashing;
- server-side expiring sessions;
- secure session cookies;
- role enforcement foundation;
- identity audit events;
- authentication APIs and Royal Gate UI.

Representative commit: `6fc42a088b07d02b1f64a3270bec5838cd272ea3`

Still later identity hardening: recovery, completed email verification, MFA/trusted devices, and broader abuse/notification controls.

### Shared K.I.N.G.S. AI boundary

Implemented:

- Collector's Kingdom routes AI tasks server-to-server through K.I.N.G.S. AI;
- model/provider credentials stay out of browser code;
- K.I.N.G.S. AI owns model routing while Collector's Kingdom owns collection/identity/Marketplace authorization;
- The Keeper may advise through AI but cannot silently mutate Kingdom records.

Representative commit: `e98674f6d5977e607db50695cbcc87f78b96e2f8`

### IMP-004 — Great Hall & Navigation

Implemented:

- authenticated personalized Great Hall;
- permanent castle-and-grounds navigation;
- Kingdom Street Market outside the castle;
- real identity activity;
- honest availability states for staged services;
- quick actions and conversational Keeper entry;
- room-aware persistent Keeper roles;
- Royal Vault and Marketplace entrances;
- responsive royal-estate UI foundation.

Representative commit: `8e5fd453e477997b9257977f8ace07e617e7fc7a`

### IMP-005 — Royal Vault verified capabilities

Implemented and verified:

- permanent owner-scoped treasure UUIDs;
- treasure create/read/update/archive;
- collection groups;
- arbitrary-depth physical storage hierarchy such as room → safe → shelf → binder → page → pocket;
- broad/custom collectible categories;
- condition, variant, quantity, acquisition date, purchase cost, identifiers, descriptions, notes, and custom attributes;
- normalized accent-tolerant search/filter/sort;
- duplicate candidate detection without destructive automatic merging;
- treasure history/audit events;
- real record/unit/category statistics;
- purchase totals kept separate by currency;
- versioned JSON export including archived records;
- authenticated Great Hall integration with real Vault counts;
- responsive `/vault.html` workspace;
- The Keeper acting as Royal Curator.

#### Secure private media

Implemented and verified:

- private owner-scoped JPEG/PNG/WebP/GIF/AVIF/PDF storage outside the public webroot;
- generated storage keys;
- file-signature detection plus declared MIME and extension agreement;
- unsafe filename/path rejection;
- size/count/account storage limits;
- authenticated list/read/delete;
- private no-store retrieval;
- media audit events;
- responsive image/document UI.

Key verification checkpoint: Quality Gates #309, run `33956000131`, **PASS**.

#### Kingdom voice command / talk-to-text

Implemented and verified:

- reusable `SpeechRecognition` / prefixed recognition layer where supported;
- same-origin-only microphone policy;
- on-device speech preference where browser support exists;
- voice navigation across Kingdom locations;
- spoken Keeper questions;
- voice search;
- spoken `add treasure` command;
- dictation for Great Hall/Vault search, Keeper messages, treasure title, description, condition notes, and collector notes;
- typed fallback when recognition is unavailable;
- destructive commands such as delete/archive/sell/buy/transfer intentionally excluded from executable voice grammar.

Camera remains `camera=()` until the scanner feature is real.

#### Transactional import / bulk migration

Implemented and verified:

- `packages/vault/src/import-repository.mjs` — persisted review batches/rows and atomic commit boundary;
- `packages/vault/src/import-service.mjs` — validation, duplicate review, expiry, stale-checking, idempotency, provenance, and commit orchestration;
- `apps/web/vault-import-http.mjs` — authenticated preview/get/commit API;
- `apps/web/public/vault-import-core.js` — JSON/CSV parsing, common collector-header inference, field mapping, price conversion, identifier mapping, custom attributes, and decision construction;
- `apps/web/public/vault-import-ui.js` — recoverable responsive review/commit workflow;
- `apps/web/public/vault-import.css` — responsive review chamber styling;
- automated tests for parser edge cases, mapping, duplicate decisions, API preview/commit/retry, expiry, owner isolation, stale duplicates, and forced rollback;
- required production build artifacts for all import modules.

Important verification history:

- initial integration run correctly failed because the older server test harness did not instantiate the newly required import service; production wiring was correct and the harness was fixed;
- forced mid-batch failure test proved complete SQLite rollback;
- later UI gate correctly caught the repository's anti-placeholder policy on an ordinary DOM property name; implementation was changed without weakening the policy;
- **Quality Gates #328 (`33958812569`) passed** after that correction.

---

## Competitive research records

Current dated reconnaissance:

- `docs/research/2026-09-05-IMP-005-VAULT-COMPETITIVE-RECON.md`
- `docs/research/2026-09-05-IMP-005-INTAKE-IMPORT-SCANNER-RECON.md`

The latest intake research compares current iCollect/CLZ migration and scan workflows and records browser camera constraints. The Kingdom improvement direction is cross-device server-side intake, recoverable review, explicit uncertainty, atomic writes, idempotent retries, and manual fallbacks rather than device-specific or blind automation.

---

## Known unfinished IMP-005 work

- Royal Intake Queue for rapid cross-device capture;
- progressive camera/barcode scanner;
- external catalog/recognition candidate adapters;
- image recognition candidate workflow;
- bulk update/archive beyond import creation;
- editing/reorganization of existing collection groups and location nodes;
- saved filters/views and further very-large-collection performance work;
- insurance/reporting outputs beyond JSON export;
- evidence-backed market valuation feeds/history.

None of these should be presented as live until their real services and tests exist.

---

## Exact next engineering target

### IMP-005 — Royal Intake Queue

Build an owner-scoped persistent intake queue that improves on current phone-scanner/web-queue products:

1. manual identifier capture first, usable on every supported device;
2. pending queue stored server-side so phone capture can continue on Chromebook/desktop;
3. repeated scans of the same pending identifier represented by a capture count rather than noisy duplicate queue rows;
4. queue history/status and explicit dismissal/completion;
5. a reviewed queue entry can start a new Vault treasure workflow without automatically claiming exact identity;
6. responsive mobile/Chromebook queue UI;
7. only after that foundation is green, enable `camera=(self)` and add a user-initiated `BarcodeDetector` scanner when supported;
8. always retain manual identifier entry when camera/barcode APIs are unavailable;
9. later external catalog adapters return candidates/evidence/confidence for collector review.

---

## Verification standard

Full repository verification:

```bash
npm ci
npm run verify
```

`npm run verify` runs lint/policy checks, module-contract checks, automated tests, production build, and production-artifact verification. GitHub Actions also performs the production dependency audit and is the required remote quality gate before a milestone is recorded as verified.
