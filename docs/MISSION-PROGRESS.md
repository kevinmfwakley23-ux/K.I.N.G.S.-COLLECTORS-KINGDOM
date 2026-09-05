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
**Latest verified checkpoint:** **Previewed Atomic Bulk Treasure Reorganization — backend + responsive browser workflow**  
**Latest verified code gate:** **Kingdom Quality Gates #460** — run `33968551319` — **PASS**  
**Verified code commit:** `002e509d6426d2f57bdca1b4225abdc5b2e932c6`  
**Working branch:** `imp-005-atomic-bulk-reorganization`  
**Pull request:** `#9` — `IMP-005: previewed atomic bulk treasure reorganization`

### Exact recovery point

Do **not** rebuild bulk movement.

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
- **persistent review-before-mutate bulk reorganization batches**;
- **atomic collection/location movement for up to 100 selected permanent treasure UUIDs**;
- **owner-scoped stale-state revalidation, required idempotency keys, safe replay, and linked audit history**;
- **responsive browser multi-selection/search/destination/preview/confirm movement workflow**;
- ordered browser enhancement bootstrap that loads import → intake → scanner → provenance → individual reorganization → bulk reorganization UI.

### Construction-document guidance used for the latest pass

`K.I.N.G.S. Collectibles construction documents .pdf` remains authoritative.

The atomic movement pass follows its requirements for:

- flexible collection/folder organization;
- physical storage location as a first-class treasure concern;
- movement between organization structures without replacing permanent treasure identity;
- centralized backend business rules;
- responsive cross-device collection management;
- collector control over meaningful record actions;
- history/audit preservation;
- non-destructive first implementation of bulk movement.

### Research completed before the latest pass

Pass-specific research record:

- `docs/research/2026-09-05-IMP-005-ATOMIC-BULK-REORGANIZATION.md`

Current first-party/active sources inspected included PriceCharting, Ludex, CollX, and HomeBox issue/discussion threads.

Useful patterns adopted:

- explicit multi-item selection;
- explicit destination selection;
- collection folders/lists as a normal collector workflow;
- movement as an operation on the existing physical item instead of cloning identity;
- linked movement history as a useful collector record.

Kingdom improvements beyond those baselines:

- preview is a persistent server-owned batch, not a client-only confirmation screen;
- preview stores each selected treasure's exact organization/version snapshot;
- commit opens one `BEGIN IMMEDIATE` SQLite transaction and revalidates destinations plus every selected treasure inside it;
- any stale/missing selected treasure aborts the whole movement and moves **zero** selected treasures;
- commit requires an `Idempotency-Key` and safe replay does not duplicate movement/history;
- cross-owner or missing selected IDs produce generic row-level validation without leaking another collector's record;
- only requested organization columns change; permanent UUIDs, media, provenance, identifiers, acquisition data, and all other authoritative treasure content remain attached;
- destructive bulk archive/delete remains unavailable.

### Latest implemented slice

Files added/changed include:

- `packages/vault/src/reorganization-repository.mjs`
- `packages/vault/src/reorganization-service.mjs`
- `apps/web/vault-reorganization-http.mjs`
- `apps/web/server.mjs`
- `apps/web/public/vault-bulk-reorganization-core.js`
- `apps/web/public/vault-bulk-reorganization-ui.js`
- `apps/web/public/vault-bulk-reorganization.css`
- `apps/web/public/vault-extras.js`
- `tests/vault-bulk-reorganization.test.mjs`
- `tests/vault-bulk-reorganization-server.test.mjs`
- `tests/vault-bulk-reorganization-ui.test.mjs`
- `tests/vault-extras.test.mjs`
- `tools/typecheck.mjs`
- `tools/verify-build.mjs`
- `docs/research/2026-09-05-IMP-005-ATOMIC-BULK-REORGANIZATION.md`

Verified behavior:

- `POST /api/vault/reorganization/bulk/preview` accepts 1–100 unique permanent treasure IDs and collection and/or storage-location destination intent;
- explicit destination `null` clears only the chosen organization dimension, while omitted dimensions remain unchanged;
- preview writes no treasure organization changes;
- preview records exact before-state and returns row-level ready/error results;
- `GET /api/vault/reorganization/bulk/:batchId` is owner scoped;
- `POST /api/vault/reorganization/bulk/:batchId/commit` requires `Idempotency-Key`;
- stale selected treasure state or missing destination causes a conflict with no partial movement;
- successful commit is all-or-nothing;
- same batch + same idempotency key replays the committed result without duplicating mutations or history;
- each changed treasure receives `vault.treasure_reorganized` audit history and the batch receives `vault.bulk_reorganization_committed`;
- rich treasure fields and private media remain attached to the same permanent treasure UUID after movement;
- the live browser Vault exposes **Move treasures** with server-backed search, selection across searches, destination keep/clear/set controls, exact preview cards, and explicit confirmation;
- browser changes invalidate an old preview before confirmation;
- no bulk DELETE/archive action exists;
- `/api/vault` truthfully reports `bulkMoveAvailable`, preview requirement, atomic commit availability, maximum selection, and destructive-bulk status.

Quality Gates #449 first verified the backend after one test-harness prototype mismatch was corrected. Quality Gates #458 verified the responsive browser workflow. Quality Gates #460 verified the final capability-reporting integration and full branch behavior.

---

## Exact next engineering target

**IMP-005 — Saved Vault Views + Large-Collection Retrieval Performance**

Before coding, re-read the construction-document large-collection/search requirements and research current saved-search/view and large-inventory patterns in strong collector applications and active open-source inventory systems.

Build the next short slice in this order:

1. define a persistent owner-scoped saved-view model for real Vault filters/sort order rather than storing rendered results;
2. save only supported normalized query/filter/sort fields and reject unknown or unsafe state;
3. provide create/list/update/delete saved-view APIs with explicit collector authorization;
4. ensure applying a saved view executes against current authoritative treasure data rather than a stale snapshot;
5. preserve URL/query compatibility so views remain shareable within the authenticated collector experience where appropriate;
6. add pagination/cursor or another deterministic large-result boundary instead of relying on one 500-record browser fetch;
7. add/verify SQLite indexes supporting the actual high-frequency owner/filter/sort access paths before claiming performance improvement;
8. provide deterministic ordering so pagination cannot silently skip/duplicate equal-sort records;
9. add responsive saved-view controls without replacing ordinary search/filter exploration;
10. keep saved views private to the owner and never imply that a saved view is a separate collection or ownership structure;
11. add domain/API/performance-regression tests and meaningful large-fixture coverage;
12. pass full quality gates and update this ledger before moving to category-specific catalog expansion or valuation.

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

Authenticated collection/location PATCH, strict allowlists, bounded JSON, cycle/owner protection, no DELETE, truthful pre-bulk capability state.

### Responsive reorganization controls

**Quality Gates #444** — run `33965170288` — PASS on `2245f52a7bd6d0edbec9f8c89d7977d7306c76fa`.

Construction-guided responsive collection/location Manage UI with client-side descendant parent filtering and server-authoritative mutation validation.

### Previewed Atomic Bulk Treasure Reorganization

**Backend gate:** Quality Gates #449 — PASS.  
**Responsive browser gate:** Quality Gates #458 — PASS.  
**Final capability/integration gate:** **Quality Gates #460** — run `33968551319` — PASS on `002e509d6426d2f57bdca1b4225abdc5b2e932c6`.

Persistent owner-scoped preview batches, explicit destination intent, 1–100 permanent UUID selection, row-level review, stale-state protection, one-transaction all-or-nothing commit, idempotent retry, permanent identity/media/provenance preservation, linked audit history, responsive multi-select/search/preview/confirm UI, and truthful capability reporting.

---

## Known unfinished IMP-005 work

Do not represent these as live until separately implemented and verified:

- saved searches/views and larger-collection pagination/performance work;
- destructive bulk archive/delete flows;
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
