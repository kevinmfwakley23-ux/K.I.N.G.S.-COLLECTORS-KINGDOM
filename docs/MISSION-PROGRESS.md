# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering recovery ledger. Read it before substantial implementation work and update it after every major verified code batch.

## Permanent execution rules

- The locked K.I.N.G.S. Collectibles construction documents are the primary product/construction guide.
- Research current competitors and open-source implementations before each meaningful build pass.
- Adopt improvements only when they strengthen rather than silently replace the construction-document intent.
- Do not call functionality complete until it is real, wired, persistent/integrated where required, and supported by the strongest available quality gates.
- Preserve permanent Kingdom treasure identity across organization, provenance, Marketplace, grading, insurance, valuation, and legacy expansion.
- Never manufacture market values, identification certainty, provenance verification, grading certainty, activity, or successful mutations.

---

## Current checkpoint

**Date:** 2026-09-05  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified checkpoint:** **Category-Specific Catalog Intelligence — Pokémon TCG exact-card review workflow**  
**Latest verified implementation gate:** **Kingdom Quality Gates #480** — run `33970697179` — **PASS**  
**Verified implementation commit:** `fdc04a828119bbeaf8ca18db88c2c8f8a975005f`  
**Working branch:** `imp-005-trading-card-catalog`  
**Pull request:** `#11` — `IMP-005: Pokémon trading-card catalog intelligence`

### Exact recovery point

Do **not** rebuild saved views, large-result pagination, bulk movement, or the first Pokémon catalog adapter.

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
- review-only UPCitemdb UPC/EAN/GTIN candidates with provider commerce/price/image data excluded;
- append-only Provenance & Ownership Ledger;
- cycle-safe individual collection/location stewardship;
- previewed atomic bulk treasure movement for up to 100 permanent UUIDs;
- owner-scoped stale-state revalidation, idempotency, safe replay, and linked movement history;
- persistent private Saved Vault Views storing normalized query/filter/sort definitions rather than rendered results;
- deterministic keyset pagination with default 50 / maximum 100 records per page;
- opaque query-bound cursors with permanent UUID tie-breaking;
- responsive Saved Vault Views controls and Load more inventory flow;
- SQLite paging indexes verified by `EXPLAIN QUERY PLAN` for default and collection-scoped retrieval;
- **review-only Pokémon TCG exact-card candidates behind the shared provider-neutral catalog service**;
- **Royal Intake support for `pokemon-card-id` and `pokemon-set-number`**;
- **responsive Pokémon candidate lookup and copy-to-new-unsaved-treasure-editor workflow**;
- **explicit separation between provider identification evidence and physical variant, condition, grade, provenance, ownership, and valuation**.

### Construction-document guidance used for the latest pass

`K.I.N.G.S. Collectibles construction documents .pdf` remains authoritative.

The Pokémon trading-card pass follows its requirements for:

- fast collector intake without surrendering collector authority;
- category-aware metadata and catalog intelligence;
- provider-independent permanent treasure identity;
- mobile/Chromebook/desktop continuity through the existing Intake Queue;
- review before authoritative record creation;
- truthful uncertainty around exact variants, grading, provenance, and value;
- centralized server-side provider access and credentials;
- portable evidence rather than provider lock-in.

### Research completed before the latest pass

Pass-specific research record:

- `docs/research/2026-09-05-IMP-005-TRADING-CARD-CATALOG.md`

Current sources/workflows inspected included Pokémon TCG API documentation/terms/data, TCGdex, TCGplayer, Ludex, CollX, and Scryfall guidance for the next adapter.

Key research decisions:

- TCGplayer's current documentation says new API access is not being granted, so the Kingdom does not make the new core card-identification path depend on obtaining TCGplayer credentials.
- Pokémon TCG API is used first for exact provider card ID and explicit set-ID/card-number retrieval.
- The first adapter deliberately avoids provider set pagination because current upstream ecosystem evidence includes paging reliability concerns for very large sets.
- TCGdex remains a later multilingual/fallback Pokémon candidate after explicit multi-provider reconciliation/deduplication semantics are built.
- Ludex/CollX confirm the value of fast recognition/review/collection workflows, but the Kingdom keeps provider identification, physical-copy facts, and valuation separate in the data model.
- Scryfall is the next provider because it has strong MTG print semantics and explicit API traffic guidance, but MTG finish/language/layout/reprint behavior deserves a dedicated mapping rather than being forced into Pokémon fields.

### Latest implemented slice

Files added/changed in PR #11 include:

- `packages/catalog/src/pokemon-tcg-provider.mjs`
- `packages/catalog/src/runtime.mjs`
- `config/runtime.mjs`
- `packages/vault/src/intake-service.mjs`
- `apps/web/public/vault-intake-core.js`
- `apps/web/public/vault-intake-ui.js`
- `apps/web/public/vault-catalog-core.js`
- `tests/pokemon-tcg-provider.test.mjs`
- `tests/pokemon-vault-ui.test.mjs`
- `tests/pokemon-intake-ui-artifact.test.mjs`
- `tests/vault-intake.test.mjs`
- `tests/catalog-runtime.test.mjs`
- `tests/catalog-runtime-wiring.test.mjs`
- `tests/config.test.mjs`
- `docs/research/2026-09-05-IMP-005-TRADING-CARD-CATALOG.md`

Verified behavior:

- `pokemon-card-id` accepts an exact provider card ID such as `base1-4`;
- `pokemon-set-number` accepts explicit `setId/cardNumber` or `setId:cardNumber` and normalizes to the provider card identity;
- provider transport requires HTTPS outside local testing;
- optional Pokémon provider API key is server-only and is sent through request headers, never browser code;
- conservative serialized provider pacing, timeout, and response-size limits are enforced;
- provider 404 returns an honest no-match rather than manufacturing a candidate;
- provider 429 and upstream failures remain explicit/retryable errors;
- malformed/oversized/structurally invalid responses are rejected;
- normalized candidates include identification metadata such as title, set/series, card number, rarity, artist, type/subtype, HP, release date, provider record ID, and source URL where available;
- provider TCGPlayer/Cardmarket-style price/commerce material and images are excluded from normalized candidate evidence;
- Royal Intake can capture both Pokémon exact-identifier modes and preserves pending history/owner isolation;
- existing saved catalog keys can surface as duplicate-review candidates without asserting that two physical cards are the same item;
- the responsive Intake UI exposes `Find Pokémon card candidate` for supported Pokémon identifiers;
- a selected candidate copies into a **new unsaved treasure editor** and never directly writes a Vault treasure;
- the draft may prefill Trading Card category, Pokémon, set/series, catalog key, rarity, artist, and evidence attributes;
- the draft does not automatically set physical variant/parallel, finish, condition, grade, purchase price, market value, provenance, ownership, or transaction state;
- runtime capability tests assert the Pokémon provider and both exact identifier modes while preserving `automaticVaultMutation: false` and `valuationFromCatalogProviders: false`.

Verification sequence:

- **Quality Gates #479** — initial PR gate — **FAILED 1/127** because an older runtime wiring test still asserted exactly two catalog providers. All new Pokémon provider/Intake/UI tests passed.
- The stale test contract was updated to assert the new provider and capability flags instead of weakening the check.
- **Quality Gates #480** — run `33970697179` — **PASS** on `fdc04a828119bbeaf8ca18db88c2c8f8a975005f`.
- #480 passed lint, type contracts, the full test suite, production build/build verification, and production dependency audit.

---

## Exact next engineering target

**IMP-005 — Magic: The Gathering Catalog Intelligence via Scryfall**

Before coding, verify current Scryfall API guidance and MTG print semantics. Extend the existing provider-neutral review-only architecture; do not create a second catalog subsystem.

Build the next short slice in this order:

1. document current Scryfall API traffic rules, User-Agent/Accept requirements, bulk-data guidance, and relevant data-use boundaries;
2. define exact MTG identifier modes that are useful to collectors without claiming visual authentication;
3. map set code + collector number, Scryfall card/printing ID, language, rarity, release date, frame/layout/card-face metadata, digital/promo flags, and available finishes as review evidence;
4. distinguish card Oracle identity from a specific physical printing and preserve permanent Kingdom treasure UUID as authoritative item identity;
5. treat `finishes` as provider-declared possibilities unless the collector explicitly confirms the physical finish;
6. do not map Scryfall `prices`, purchase URIs, affiliate/store links, or other commerce data into authoritative Kingdom valuation;
7. send meaningful `User-Agent` and `Accept` headers and stay beneath Scryfall's current published request guidance;
8. add timeout, response-size, 404, 429, 5xx, malformed-payload, and exact-identifier mismatch protections;
9. add MTG identifier types to the Royal Intake Queue and responsive review UI;
10. copy candidate data only to a new unsaved treasure editor and require explicit collector Save;
11. add provider/domain/runtime/Intake/UI regression tests and production artifact checks;
12. pass full Kingdom quality gates;
13. update this ledger and README before merging or expanding into sports cards, grading verification, image recognition, or valuation.

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
**Planner/index proof gate #475** — run `33969652785` — PASS.  
Private saved query definitions, current-data execution, deterministic keyset pagination, query-bound opaque cursors, 50/100 page boundaries, 135-record equal-sort traversal proof, responsive saved-view controls, live Load more workflow, and verified SQLite paging-index selection.

### Pokémon TCG Category Catalog Intelligence

**Quality Gates #480** — run `33970697179` — PASS on `fdc04a828119bbeaf8ca18db88c2c8f8a975005f`.  
Exact provider-card-ID/set-card-number candidates, server-only provider access, bounded transport, identification-only normalized evidence, Royal Intake integration, responsive candidate review, unsaved editor prefill, and explicit exclusion of automatic physical variant/grade/value/provenance/ownership mutation.

---

## Known unfinished IMP-005 / later work

Do not represent these as live until separately implemented and verified:

- destructive bulk archive/delete flows;
- Magic: The Gathering / Scryfall candidates;
- sports-card provider candidates;
- comic-specific provider candidates;
- video-game-specific provider candidates;
- vinyl/music provider candidates;
- multi-provider Pokémon reconciliation/fallback;
- grading-company verification;
- evidence-backed market valuation and value history;
- image recognition / visual collectible identification;
- insurance/reporting outputs beyond portable JSON export;
- universal camera scanning where native `BarcodeDetector` does not exist;
- universal speech recognition where Web Speech recognition is unavailable;
- Marketplace ownership transfer and settlement workflows beyond the existing architectural shell.

### Permanent truthfulness boundary

Market value stays absent/null until backed by real valuation evidence. A barcode, image, AI answer, external catalog candidate, title match, ISBN, catalog ID, receipt, certificate number, grading label, provider finish list, or collector-entered provenance statement is never silently upgraded into an authoritative independently verified claim. Permanent Kingdom treasure IDs remain provider-independent.
