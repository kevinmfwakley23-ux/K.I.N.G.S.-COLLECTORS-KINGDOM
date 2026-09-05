# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering recovery ledger. Read it before substantial implementation work and update it after every major verified code batch.

## Permanent execution rules

- The locked K.I.N.G.S. Collectibles construction documents are the primary product/construction guide.
- Research current competitors and open-source implementations before each meaningful build pass.
- Adopt improvements only when they strengthen rather than silently replace the construction-document intent.
- Do not call functionality complete until it is real, wired, persistent/integrated where required, and supported by the strongest available quality gates.
- Preserve permanent Kingdom treasure identity across organization, provenance, Marketplace, grading, insurance, valuation, and legacy expansion.
- Never manufacture market values, identification certainty, provenance verification, activity, or successful mutations.

---

## Current checkpoint

**Date:** 2026-09-05  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified checkpoint:** **Responsive cycle-safe collection/location stewardship controls**  
**Latest verified code gate:** **Kingdom Quality Gates #444** — run `33965170288` — **PASS**  
**Verified code commit:** `2245f52a7bd6d0edbec9f8c89d7977d7306c76fa`  
**Default branch:** `main`

### Exact recovery point

Do **not** restart IMP-005.

The Royal Vault currently has verified:

- permanent owner-scoped treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collection groups and arbitrary-depth physical locations;
- search/filter/sort and real collection statistics;
- secure private treasure media;
- voice command/talk-to-text;
- transactional JSON/CSV migration;
- Royal Intake Queue and progressive native barcode scanning;
- review-only Open Library ISBN candidates;
- review-only UPCitemdb UPC/EAN/GTIN candidates with provider price/offer data excluded;
- append-only Provenance & Ownership Ledger;
- cycle-safe collection/location update domain;
- authenticated collection/location PATCH APIs;
- responsive live collection/location stewardship UI;
- ordered browser enhancement bootstrap that loads import → intake → scanner → provenance → reorganization UI.

### Construction-document guidance used for the latest pass

`K.I.N.G.S. Collectibles construction documents .pdf` remains authoritative.

The latest UI pass specifically follows its requirements for:

- organizing treasures into meaningful collections/folders;
- editing collection information;
- physical storage location as a first-class treasure concern;
- moving collectibles between collections as an eventual workflow;
- flexible organization rather than prescriptive organization;
- responsive layouts and cross-device consistency;
- centralized backend business rules;
- an interface that encourages exploration rather than feeling like pure data entry;
- Keeper stewardship assistance without taking collector control.

### Research completed before the latest pass

Pass-specific research record:

- `docs/research/2026-09-05-IMP-005-REORGANIZATION-UI-PASS.md`

Current HomeBox implementation was inspected after public web search became temporarily unavailable. Useful pattern adopted:

- explicit edit/save intent;
- parent location selection shown prominently;
- parent selector aware of the current location.

Kingdom improvement beyond that baseline:

- browser parent options remove the current location **and every descendant** before submission;
- server validation remains authoritative against stale/forged requests;
- navigation/filter behavior remains separate from Manage behavior so ordinary exploration does not accidentally enter edit mode.

### Latest implemented slice

Files added/changed include:

- `apps/web/public/vault-reorganization-core.js`
- `apps/web/public/vault-reorganization-ui.js`
- `apps/web/public/vault-reorganization.css`
- `apps/web/public/vault-extras.js`
- `tests/vault-reorganization-ui.test.mjs`
- `tests/vault-extras.test.mjs`
- `tools/typecheck.mjs`
- `tools/verify-build.mjs`
- `docs/research/2026-09-05-IMP-005-REORGANIZATION-UI-PASS.md`

Verified behavior:

- secondary explicit **Manage** controls are added to Collections and Storage Locations;
- collection editor selects an existing collection and edits name/description;
- collection save sends only changed mutable fields to `PATCH /api/vault/collections/:id`;
- location editor selects an existing physical location and shows current path;
- location name/type/parent/notes are editable;
- current location + descendants are excluded from candidate parent options client-side;
- move-to-top-level is explicit through `parentId: null`;
- UI explains that descendants move with a branch while permanent treasure IDs do not change;
- location save sends only changed mutable fields to `PATCH /api/vault/locations/:id`;
- server remains the final owner/cycle/field-validation authority;
- API/server errors are surfaced rather than converted into false success;
- after successful save the Vault reloads authoritative server state/paths/counts;
- no collection/location DELETE controls were added;
- no bulk movement or destructive mass operation was added;
- reorganization JS/CSS and the enhanced loader are mandatory production artifacts;
- helper tests cover descendants, eligible parent choices, changed-field PATCH building, explicit top-level movement, supported location vocabulary, and identity-preservation messaging.

Quality Gates #444 passed lint, automated tests, module contracts, production build, required artifact verification, and dependency audit.

---

## Exact next engineering target

**IMP-005 — Previewed Atomic Bulk Treasure Reorganization**

Before coding, re-read the construction-document organization/movement requirements and research current competitor/open-source bulk movement workflows again.

Build the next short slice in this order:

1. define server-owned preview and commit semantics for explicitly selected permanent treasure UUIDs;
2. support destination collection and/or physical location without changing treasure IDs;
3. require all selected treasures and destinations to belong to the authenticated owner;
4. preview exact records, current organization, requested destination, and any validation failures without writing;
5. reject empty/oversized selections and duplicate treasure IDs;
6. use one transaction for commit so every selected move succeeds or none do;
7. revalidate destination/ownership at commit rather than trusting stale preview state;
8. make retries idempotent if the workflow warrants a persistent preview batch/idempotency boundary;
9. write truthful audit/history entries for each moved treasure or one clearly linked batch + per-treasure changes;
10. preserve permanent treasure UUID, provenance, media, identifiers, acquisition, and other authoritative record data;
11. keep destructive bulk archive/delete **out** of this first bulk movement slice;
12. add HTTP/domain tests before adding browser multi-selection UI;
13. pass full quality gates and update this ledger before proceeding.

---

## Verified IMP-005 milestone checkpoints

### Authoritative Vault foundation

Verified owner-scoped treasures, collections, arbitrary-depth locations, structured fields, normalized search, filtering/sorting, duplicate candidates, change history, real statistics, currency-separated purchase totals, versioned export, authenticated APIs, Great Hall real counts, and responsive Vault workspace.

### Transactional migration

**Quality Gates #328** — run `33958812569` — PASS.

Persistent preview, CSV mapping, duplicate/rejected review, explicit decisions, atomic commit, stale-preview protection, idempotent retry.

### Royal Intake Queue

**Quality Gates #347** — run `33959303126` — PASS.

Persistent cross-device identifier intake, repeat counts, dismissed history, owner isolation, editor handoff, candidate warnings.

### Progressive barcode scanner

**Quality Gates #361** — run `33959932759` — PASS.

Native `BarcodeDetector` progressive enhancement, explicit camera controls, debounce, authenticated Intake Queue writes, manual fallback, Vault-only camera permission.

### ISBN catalog candidates

**Quality Gates #379** — run `33960516422` — PASS.

Open Library review-only ISBN evidence, checksum validation, cache/rate/timeout safeguards, no Vault mutation.

### UPC/EAN/GTIN candidates

**Quality Gates #396** — run `33961349239` — PASS.

UPCitemdb review-only evidence, GS1 validation, bounded provider use, no provider price/offers/merchant/image data mapped into identification/value state.

### Provenance & Ownership Ledger

**Quality Gates #416** — run `33961966066` — PASS.

Append-only acquisition/ownership/documentation/custody/disposition/loss/recovery/correction evidence with owner isolation, audit, portable export, and responsive UI. Collector-entered evidence remains explicitly non-independently-verified.

### Cycle-safe reorganization domain

**Quality Gates #422** — run `33962143456` — PASS.

Collection/location update repository/service; cycle prevention; cross-owner rejection; branch move path recalculation; permanent treasure/reference preservation.

### Live enhancement bootstrap

**Quality Gates #425** — run `33963495455` — PASS.

Ordered dynamic enhancement bootstrap and fail-stop behavior.

### Authenticated reorganization PATCH API

**Quality Gates #433** — run `33964005746` — PASS.

Authenticated collection/location PATCH, strict allowlists, bounded JSON, cycle/owner protection, no DELETE, truthful bulk-unavailable capability.

### Responsive reorganization controls

**Quality Gates #444** — run `33965170288` — PASS on `2245f52a7bd6d0edbec9f8c89d7977d7306c76fa`.

Construction-guided responsive collection/location Manage UI with client-side descendant parent filtering and server-authoritative mutation validation.

---

## Known unfinished IMP-005 work

Do not represent these as live until separately implemented and verified:

- previewed atomic bulk treasure movement/reorganization;
- destructive bulk archive/delete flows;
- saved searches/views and larger-collection performance work;
- dedicated trading-card catalog provider candidates;
- comic-specific provider candidates;
- video-game-specific provider candidates;
- vinyl/music provider candidates;
- evidence-backed market valuation and value history;
- image recognition / visual collectible identification;
- insurance/reporting outputs beyond portable JSON export;
- universal camera scanning where native `BarcodeDetector` does not exist;
- universal speech recognition where Web Speech recognition is unavailable.

### Permanent truthfulness boundary

Market value stays absent/null until backed by real valuation evidence. A barcode, image, AI answer, external catalog candidate, title match, ISBN, catalog ID, receipt, certificate number, or collector-entered provenance statement is never silently upgraded into an authoritative independently verified claim. Permanent Kingdom treasure IDs remain provider-independent.
