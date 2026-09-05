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
**Latest verified checkpoint:** **Saved Vault Views + Deterministic Large-Collection Retrieval — backend + responsive browser workflow**  
**Latest verified implementation gate:** **Kingdom Quality Gates #475** — run `33969652785` — **PASS**  
**Verified implementation commit:** `0b43608065020e8fa9a8e13ff1e529193a167cac`  
**Working branch:** `imp-005-saved-views-pagination`  
**Pull request:** `#10` — `IMP-005: saved Vault views and large-collection retrieval`

### Exact recovery point

Do **not** rebuild bulk movement, saved views, or large-result pagination.

The Royal Vault currently has verified:

- permanent owner-scoped treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collection groups and arbitrary-depth physical locations;
- normalized search/filter/sort and real collection statistics;
- secure private treasure media;
- voice command/talk-to-text;
- transactional JSON/CSV migration;
- Royal Intake Queue and progressive native barcode scanning;
- review-only Open Library ISBN candidates;
- review-only UPCitemdb UPC/EAN/GTIN candidates with provider price/offer data excluded;
- append-only Provenance & Ownership Ledger;
- cycle-safe individual collection/location stewardship;
- previewed atomic bulk treasure movement for up to 100 permanent UUIDs;
- owner-scoped stale-state revalidation, idempotency, safe replay, and linked movement history;
- **persistent private saved Vault views that store normalized query/filter/sort definitions rather than rendered results**;
- **deterministic keyset pagination with default 50 / maximum 100 records per page**;
- **opaque query-bound cursors with permanent UUID tie-breaking**;
- **responsive Saved Vault Views controls and Load more inventory flow**;
- **SQLite paging indexes verified by `EXPLAIN QUERY PLAN` for default and collection-scoped retrieval**;
- ordered browser enhancement bootstrap that loads import → intake → scanner → provenance → individual reorganization → bulk reorganization → saved views.

### Construction-document guidance used for the latest pass

`K.I.N.G.S. Collectibles construction documents .pdf` remains authoritative.

The saved-view / large-collection pass follows its requirements for:

- strong search, filtering, sorting, and flexible collector-defined organization;
- large collections that remain usable without one oversized browser fetch;
- responsive cross-device consistency;
- centralized backend business rules;
- portable provider-independent treasure identity;
- saved exploration state that does not silently become a new collection or ownership structure;
- truthful capability reporting and collector control.

### Research completed before the latest pass

Pass-specific research record:

- `docs/research/2026-09-05-IMP-005-SAVED-VIEWS-LARGE-COLLECTIONS.md`

Current first-party/active sources inspected included PriceCharting, Ludex, CollX, and HomeBox.

Useful patterns adopted:

- collection-wide search/filter/sort;
- reusable lists/views for returning to meaningful subsets;
- responsive web/mobile collection management;
- strong large-inventory navigation and portability.

Kingdom improvements beyond those baselines:

- a saved view stores only a strict server-normalized filter/sort definition and never a frozen result list;
- view execution always queries current authoritative treasure rows;
- saved views are owner-scoped and cross-owner access returns no record details;
- page cursors are opaque and cryptographically fingerprinted to the exact normalized query definition;
- a cursor from one filter/sort state cannot be replayed against another;
- every supported sort uses permanent treasure UUID as a deterministic secondary key;
- live Vault inventory now requests 50-record pages instead of the legacy browser `limit=500` path;
- the browser labels the number of records **loaded**, rather than inventing a total it has not retrieved;
- paging indexes exist for common owner/active/sort paths plus collection/location updated-order paths, and automated tests verify SQLite actually selects the relevant indexes;
- deleting a saved view deletes only the query definition and never treasures, provenance, media, collections, or ownership data.

### Latest implemented slice

Files added/changed include:

- `packages/vault/src/query-repository.mjs`
- `packages/vault/src/query-service.mjs`
- `apps/web/vault-query-http.mjs`
- `apps/web/server.mjs`
- `apps/web/public/vault-pagination-core.js`
- `apps/web/public/vault-saved-views-core.js`
- `apps/web/public/vault-saved-views-ui.js`
- `apps/web/public/vault-saved-views.css`
- `apps/web/public/vault.js`
- `apps/web/public/vault-extras.js`
- `tests/vault-saved-views-pagination.test.mjs`
- `tests/vault-query-server.test.mjs`
- `tests/vault-saved-views-ui.test.mjs`
- `tests/vault-extras.test.mjs`
- `tools/typecheck.mjs`
- `tools/verify-build.mjs`
- `docs/research/2026-09-05-IMP-005-SAVED-VIEWS-LARGE-COLLECTIONS.md`

Verified behavior:

- saved-view records are private to the authenticated collector and use case-insensitive unique names per owner;
- unsupported saved-view state is rejected rather than silently persisted;
- `GET/POST /api/vault/views` lists/creates saved view definitions;
- `GET/PATCH/DELETE /api/vault/views/:id` reads/updates/deletes only the owner-scoped definition;
- `GET /api/vault/views/:id/results` executes the saved definition against current data;
- `GET /api/vault/query` provides deterministic bounded keyset pages;
- default page size is 50 and maximum is 100;
- page cursors are bound to normalized query + sort + order and reject mismatched reuse;
- 135 records with identical primary sort timestamps traverse across multiple pages exactly once with no duplicate or skipped permanent IDs;
- normal live Vault inventory now uses `/api/vault/query` and a **Load more treasures** control instead of fetching up to 500 records in one request;
- changing ordinary search/filter controls exits an applied saved-view override cleanly;
- responsive Saved Vault Views controls support save, apply, update, rename, and delete;
- saved-view UI explicitly states that results are live and that deleting a view does not delete treasures;
- `/api/vault` truthfully reports saved-view and keyset-pagination availability, page boundaries, and non-snapshot semantics;
- SQLite `EXPLAIN QUERY PLAN` regression tests confirm the dedicated default and collection-scoped paging indexes are selected.

Verification sequence:

- **Quality Gates #464** — backend saved views + 135-record pagination + HTTP/runtime/build contracts — PASS.
- **Quality Gates #474** — responsive saved-view UI + 50-record live Vault paging + production artifacts — PASS.
- **Quality Gates #475** — explicit SQLite planner/index-use proof + full regression suite — PASS.

---

## Exact next engineering target

**IMP-005 — Category-Specific Catalog Intelligence, Trading Cards First**

Before coding, research current trading-card identification/catalog providers, official/public data sources, active open-source card databases, licensing/terms, coverage gaps, rate limits, identifier quality, set/variant/parallel handling, grading metadata boundaries, and current collector-app workflows.

Build the next short slice in this order:

1. define a provider-neutral category-catalog contract that can support multiple card ecosystems without replacing the permanent Kingdom treasure UUID;
2. choose only lawful, current, technically sustainable provider/data sources and document licensing/terms constraints;
3. separate exact identifiers, set/card numbers, variants/parallels, grading labels, and candidate evidence so no provider match silently becomes authoritative identity;
4. start with one or more real trading-card sources that can be verified end to end before claiming broad card coverage;
5. normalize candidate evidence behind the existing review-only catalog boundary rather than creating a second identification architecture;
6. preserve source/date/provider evidence and explicit uncertainty;
7. add cache/rate/timeout/response-size safeguards appropriate to each provider;
8. add category-aware browser candidate review without automatic treasure mutation;
9. keep market price/offer fields out of authoritative valuation until the separate evidence-backed valuation milestone;
10. add provider/domain/HTTP/browser regression tests and production artifact checks;
11. pass full quality gates and update this ledger before expanding to comics, video games, vinyl/music, or evidence-backed valuation.

---

## Verified IMP-005 milestone checkpoints

### Authoritative Vault foundation

Verified owner-scoped treasures, collections, arbitrary-depth locations, structured fields, normalized search, filtering/sorting, duplicate candidates, change history, real statistics, currency-separated purchase totals, versioned export, authenticated APIs, Great Hall real counts, and responsive Vault workspace.

### Transactional migration

**Quality Gates #328** — run `33958812569` — PASS. Persistent preview, CSV mapping, duplicate/rejected review, explicit decisions, atomic commit, stale-preview protection, idempotent retry.

### Royal Intake Queue

**Quality Gates #347** — run `33959303126` — PASS. Persistent cross-device identifier intake, repeat counts, dismissed history, owner isolation, editor handoff, candidate warnings.

### Progressive barcode scanner

**Quality Gates #361** — run `33959932759` — PASS. Native `BarcodeDetector` progressive enhancement, explicit camera controls, debounce, authenticated Intake Queue writes, manual fallback, Vault-only camera permission.

### ISBN catalog candidates

**Quality Gates #379** — run `33960516422` — PASS. Open Library review-only ISBN evidence, checksum validation, cache/rate/timeout safeguards, no Vault mutation.

### UPC/EAN/GTIN candidates

**Quality Gates #396** — run `33961349239` — PASS. UPCitemdb review-only evidence, GS1 validation, bounded provider use, no provider price/offers/merchant/image data mapped into identification/value state.

### Provenance & Ownership Ledger

**Quality Gates #416** — run `33961966066` — PASS. Append-only acquisition/ownership/documentation/custody/disposition/loss/recovery/correction evidence with owner isolation, audit, portable export, and responsive UI.

### Cycle-safe reorganization domain

**Quality Gates #422** — run `33962143456` — PASS. Collection/location update repository/service; cycle prevention; cross-owner rejection; branch move path recalculation; permanent treasure/reference preservation.

### Live enhancement bootstrap

**Quality Gates #425** — run `33963495455` — PASS. Ordered dynamic enhancement bootstrap and fail-stop behavior.

### Authenticated reorganization PATCH API

**Quality Gates #433** — run `33964005746` — PASS. Authenticated collection/location PATCH, strict allowlists, bounded JSON, cycle/owner protection, no DELETE.

### Responsive reorganization controls

**Quality Gates #444** — run `33965170288` — PASS. Responsive collection/location Manage UI with client-side descendant parent filtering and server-authoritative mutation validation.

### Previewed Atomic Bulk Treasure Reorganization

**Backend gate #449** — PASS.  
**Responsive browser gate #458** — PASS.  
**Final capability/integration gate #460** — run `33968551319` — PASS.  
Persistent owner-scoped preview batches, 1–100 permanent UUID selection, stale-state protection, all-or-nothing commit, idempotent retry, identity/media/provenance preservation, linked audit history, responsive multi-select/preview/confirm UI.

### Saved Vault Views + Large-Collection Retrieval

**Backend gate #464** — PASS.  
**Responsive browser / artifact gate #474** — PASS.  
**Planner/index proof gate #475** — run `33969652785` — PASS on `0b43608065020e8fa9a8e13ff1e529193a167cac`.  
Private saved query definitions, current-data execution, deterministic keyset pagination, query-bound opaque cursors, 50/100 page boundaries, 135-record equal-sort traversal proof, responsive saved-view controls, live Load more workflow, and verified SQLite paging-index selection.

---

## Known unfinished IMP-005 / later work

Do not represent these as live until separately implemented and verified:

- destructive bulk archive/delete flows;
- dedicated trading-card catalog provider candidates;
- comic-specific provider candidates;
- video-game-specific provider candidates;
- vinyl/music provider candidates;
- evidence-backed market valuation and value history;
- image recognition / visual collectible identification;
- insurance/reporting outputs beyond portable JSON export;
- universal camera scanning where native `BarcodeDetector` does not exist;
- universal speech recognition where Web Speech recognition is unavailable;
- Marketplace ownership transfer and settlement workflows beyond the existing architectural shell.

### Permanent truthfulness boundary

Market value stays absent/null until backed by real valuation evidence. A barcode, image, AI answer, external catalog candidate, title match, ISBN, catalog ID, receipt, certificate number, grading label, or collector-entered provenance statement is never silently upgraded into an authoritative independently verified claim. Permanent Kingdom treasure IDs remain provider-independent.
