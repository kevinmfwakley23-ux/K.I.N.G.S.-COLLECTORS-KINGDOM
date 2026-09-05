# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering ledger for K.I.N.G.S. Collector's Kingdom. Read it before substantial implementation work and update it after every major verified code batch so development can recover from the repository rather than depending on chat history.

## Progress rule

A progress entry must record what was actually implemented, the important architecture changed, verification evidence, known limitations, and the exact next engineering target. Functionality is not called complete until it is wired, real, and supported by the strongest available quality gates.

---

## Current checkpoint

**Date:** 2026-09-05  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified checkpoint:** **Royal Intake Queue + transactional JSON/CSV import + secure media + Kingdom voice**  
**Latest verified code gate:** **Kingdom Quality Gates #347** — run `33959303126` — **PASS**  
**Verified code commit:** `58c60d605e107bdaeeaa5300b1de0c3fea164cfb`  
**Default branch:** `main`

### Exact recovery point

Do **not** restart IMP-005.

The Royal Vault is now a real owner-scoped collection domain with persistent treasure identity, authenticated APIs, a responsive browser workspace, secure private media, voice command/talk-to-text support, transactional bulk migration, and a cross-device Royal Intake Queue.

The latest verified Royal Intake capability includes:

- persistent owner-scoped pending intake records;
- manual capture of barcode, UPC, EAN, ISBN, catalog, serial, SKU, and custom identifiers;
- server-side queue storage so capture can begin on a phone and continue on Chromebook/desktop;
- repeated pending captures of the same normalized identifier merged into one queue record with a capture count rather than noisy duplicate queue rows;
- pending counts and total pending-capture counts;
- exact existing-Vault identifier candidates surfaced as warnings/evidence without asserting that the captured identifier proves exact collectible identity;
- owner isolation for listing and dismissing queue items;
- soft dismissal that preserves intake history;
- re-capture after dismissal creates a new pending intake event rather than mutating old history;
- responsive phone/desktop Royal Intake Queue UI;
- one-click handoff into the treasure editor that copies the identifier but intentionally leaves the queue item pending until the collector explicitly dismisses it;
- warnings to review exact identity and quantity before saving a treasure, especially when the same identifier was captured more than once;
- authenticated no-store HTTP API;
- audit events for capture and dismissal;
- camera remains intentionally disabled and reported unavailable until the real scanner is implemented and verified.

The **next validated engineering target** is the progressive secure barcode-camera scanner on top of the verified Intake Queue. It must remain user-initiated, same-origin, secure-context-only, and optional. Manual intake remains first-class on unsupported browsers. Camera detections must feed the same server-side queue and must never silently create or identify authoritative treasures.

External catalog adapters, image-recognition candidates, evidence-backed valuation, and Marketplace mutations remain unimplemented and must not be represented as live.

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

#### Royal Intake Queue

Implemented and verified:

- `packages/vault/src/intake-repository.mjs` — persistent owner-scoped pending/dismissed intake records and capture counts;
- `packages/vault/src/intake-service.mjs` — validation, identifier normalization, owner authorization, Vault-candidate evidence, audit events, and queue statistics;
- `apps/web/vault-intake-http.mjs` — authenticated list/capture/dismiss boundary with bounded request size and no-store responses;
- production server wiring and `/api/vault` capability/count reporting;
- `apps/web/public/vault-intake-core.js` — safe editor-handoff and collector-facing status helpers;
- `apps/web/public/vault-intake-ui.js` — responsive cross-device capture, queue, history, warnings, dismissal, and editor handoff;
- `apps/web/public/vault-intake.css` — responsive phone/desktop styling;
- tests covering repeat-capture merging, capture counts, owner isolation, history, re-capture after dismissal, identifier validation, exact existing-Vault candidate warnings, authenticated HTTP behavior, editor handoff, and camera-still-disabled policy;
- build/type/artifact gates require all Intake Queue production modules.

**Verification:** Kingdom Quality Gates #347, run `33959303126`, verify job **SUCCESS** including full repository quality gates and production dependency audit.

The CLZ-style phone-to-web scan-queue pattern influenced this direction, but the Kingdom improves it by using one owner-scoped server queue for both manual and future camera capture, preserving repeated-capture counts/history, surfacing existing-Vault evidence, and refusing to equate capture with authoritative identity.

---

## Competitive research records

Current dated reconnaissance:

- `docs/research/2026-09-05-IMP-005-VAULT-COMPETITIVE-RECON.md`
- `docs/research/2026-09-05-IMP-005-INTAKE-IMPORT-SCANNER-RECON.md`

The latest intake research compares current iCollect/CLZ migration and scan workflows and records browser camera constraints. The Kingdom improvement direction is cross-device server-side intake, recoverable review, explicit uncertainty, atomic writes, idempotent retries, and manual fallbacks rather than device-specific or blind automation.

---

## Known unfinished IMP-005 work

- progressive secure camera/barcode scanner;
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

### IMP-005 — Secure barcode-camera scanner

Build the scanner as a progressive enhancement on the verified Royal Intake Queue:

1. harden identifier matching against arbitrary provider-specific external identifier keys;
2. add pure scanner format/detection/debounce helpers with tests;
3. expose a camera button only when the browser is in a secure context and supports both `mediaDevices.getUserMedia` and `BarcodeDetector`;
4. query supported barcode formats rather than assuming availability;
5. request an environment-facing camera only after explicit collector action;
6. stop camera tracks when the scanner closes, page leaves, or becomes inactive;
7. feed detections into `/api/vault/intake` with `sourceType: camera`;
8. debounce frame-repeat noise while retaining meaningful repeated scan counts;
9. enable `Permissions-Policy: camera=(self)` only when the scanner is implemented/tested;
10. preserve manual intake whenever the scanner APIs are unavailable;
11. never auto-create an authoritative treasure or claim an exact catalog match from a scan alone.

---

## Verification standard

Full repository verification:

```bash
npm ci
npm run verify
```

`npm run verify` runs lint/policy checks, module-contract checks, automated tests, production build, and production-artifact verification. GitHub Actions also performs the production dependency audit and is the required remote quality gate before a milestone is recorded as verified.
