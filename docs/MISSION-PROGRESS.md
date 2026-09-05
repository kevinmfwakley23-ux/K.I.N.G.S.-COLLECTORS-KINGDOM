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
**Latest verified checkpoint:** **Category-Specific Catalog Intelligence — Magic: The Gathering exact-printing review via Scryfall**  
**Latest verified implementation gate:** **Kingdom Quality Gates #485** — run `33971901302` — **PASS**  
**Verified implementation commit:** `1301f2d4b49530f87ea99124ed202d2b9dcb2efc`  
**Working branch:** `imp-005-scryfall-mtg-catalog`  
**Pull request:** `#12` — `IMP-005: Scryfall Magic catalog intelligence`

### Exact recovery point

Do **not** rebuild saved views, large-result pagination, bulk movement, Pokémon catalog intelligence, or the first Scryfall/MTG adapter.

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
- private Saved Vault Views with deterministic keyset pagination and verified SQLite paging indexes;
- **review-only Pokémon TCG exact-card candidates** using provider card ID or set/card identifiers;
- **review-only Magic: The Gathering exact-printing candidates via Scryfall** using printing UUID or set/collector identifiers;
- **Royal Intake support for Pokémon and Magic exact identifiers**;
- **responsive provider candidate review and copy-to-new-unsaved-editor workflows**;
- **explicit separation between provider catalog evidence and physical variant/finish, condition, grade, authenticity, provenance, ownership, and valuation**.

### Construction-document guidance used for the latest pass

`K.I.N.G.S. Collectibles construction documents .pdf` remains authoritative.

The Scryfall/MTG pass follows its requirements for:

- category-aware collector intelligence without surrendering collector authority;
- permanent provider-independent Kingdom treasure identity;
- mobile/Chromebook/desktop continuity through the existing Intake Queue;
- review before authoritative record creation;
- truthful uncertainty around print finish, language, condition, grading, authenticity, provenance, and value;
- centralized server-side provider transport and traffic rules;
- portable evidence instead of provider lock-in;
- one shared catalog architecture instead of a separate subsystem per collectible type.

### Research completed for the latest pass

Pass-specific research record:

- `docs/research/2026-09-05-IMP-005-SCRYFALL-MTG-CATALOG.md`

Current Scryfall guidance and active SDK/tooling were inspected before implementation.

Key decisions:

- exact lookup modes only for the first MTG slice: `mtg-scryfall-id` and `mtg-set-number`;
- Scryfall printing `id` and `oracle_id` remain separate evidence concepts;
- set code, collector number, language, rarity, release date, artist, layout/frame, card faces, print flags, and available finishes are bounded review metadata;
- `finishes` describes provider-declared available finishes and does not prove the collector's physical finish;
- Scryfall prices, purchase/store links, image URIs, and commerce material are excluded from normalized catalog candidates;
- large-volume future enrichment should use Scryfall bulk data rather than repeatedly walking the live API;
- external requests use HTTPS, meaningful User-Agent, explicit JSON Accept, shared caching, and conservative serialized traffic;
- the Kingdom defaults to 150 ms request spacing (~6.7/sec), an internal safety margin beneath Scryfall's published under-10-requests/sec guidance;
- 429 is surfaced explicitly; there is no aggressive automatic retry loop.

### Latest implemented slice

Files added/changed in PR #12 include:

- `packages/catalog/src/scryfall-provider.mjs`
- `packages/catalog/src/runtime.mjs`
- `config/runtime.mjs`
- `packages/vault/src/intake-service.mjs`
- `apps/web/public/vault-intake-core.js`
- `apps/web/public/vault-catalog-core.js`
- `apps/web/public/vault-intake-ui.js`
- `.env.example`
- `tests/scryfall-provider.test.mjs`
- `tests/mtg-intake.test.mjs`
- `tests/scryfall-vault-ui.test.mjs`
- `tests/scryfall-intake-ui-artifact.test.mjs`
- `tests/catalog-runtime-wiring.test.mjs`
- `tests/catalog-runtime.test.mjs`
- `tests/config.test.mjs`
- `tests/vault-intake.test.mjs`
- `tools/typecheck.mjs`
- `tools/verify-build.mjs`
- `docs/research/2026-09-05-IMP-005-SCRYFALL-MTG-CATALOG.md`

Verified behavior:

- `mtg-scryfall-id` validates an exact Scryfall printing UUID before outbound lookup;
- `mtg-set-number` accepts exact `setCode/collectorNumber` or `setCode:collectorNumber` and normalizes it;
- Scryfall transport requires HTTPS outside local testing;
- requests send a meaningful K.I.N.G.S. Collector's Kingdom User-Agent and explicit JSON Accept header;
- default provider spacing is 150 ms and requests are serialized;
- provider access has timeout and maximum response-size protection;
- 404 returns an honest no-match;
- 429 remains an explicit retryable rate-limit failure without automatic retry-through behavior;
- malformed JSON, malformed payloads, oversized responses, and upstream errors fail explicitly;
- the returned printing UUID or set/collector identity must match the requested evidence key;
- normalized candidates preserve Scryfall printing ID and Oracle ID separately;
- bounded print metadata includes title, set, collector number, language, rarity, release date, artist, layout, type line, frame, border color, available finishes, promo/digital/reprint/variation flags, and bounded multiface summaries;
- Scryfall `prices`, `purchase_uris`, store/affiliate material, and `image_uris` are excluded from normalized evidence;
- Royal Intake accepts Magic set/collector and Scryfall printing identifiers and preserves owner isolation/history;
- a saved catalog key can surface as a duplicate-review warning without asserting two physical cards are the same item;
- responsive Intake UI exposes `Find Magic printing candidate`;
- selected Scryfall evidence copies only into a **new unsaved treasure editor**;
- draft metadata does not set physical finish/variant, condition, grade, authenticity, provenance, ownership, market value, or purchase price;
- runtime capabilities report both MTG exact modes while preserving `automaticVaultMutation: false` and `valuationFromCatalogProviders: false`;
- production contract/artifact checks now explicitly require both Pokémon and Scryfall provider modules.

Verification sequence:

- **Quality Gates #484** — initial Scryfall PR gate — **FAILED 1/139** because an older Royal Intake error-message test still asserted the pre-Magic controlled identifier list. All new Scryfall/MTG provider, Intake, UI, truthfulness, runtime, type-contract, and artifact tests reached before that failure were green.
- The stale test was updated to require the expanded controlled vocabulary including both Magic identifier modes; production behavior was not weakened.
- **Quality Gates #485** — run `33971901302` — **PASS** on `1301f2d4b49530f87ea99124ed202d2b9dcb2efc`.
- #485 passed lint, type contracts, all 139 tests, production build/build artifact verification, and production dependency audit.

---

## Exact next engineering target

**IMP-005 — Sports-Card Catalog Evidence + Grading-Cert Verification Boundaries**

Current reconnaissance has identified two distinct evidence classes that must not be conflated:

1. **SportsCardsPro / PriceCharting catalog evidence**
   - real sports-card product/catalog APIs exist;
   - API access requires a paid subscription/token;
   - the documented limit is one API call per second;
   - product records include a provider product ID, set name, product/card name, and price-heavy fields;
   - if integrated, identification-only fields must be allowlisted and every price field excluded from the catalog evidence path;
   - server-only credentials are required and subscription-dependent capability must be reported honestly.

2. **PSA certification verification evidence**
   - PSA exposes an authenticated public API for single certification-number lookup;
   - certificate verification can confirm PSA database data associated with a cert number;
   - PSA itself warns that certification-number verification does not eliminate counterfeit risk and does not prove a physical item presented online is genuine;
   - therefore cert evidence must be a separate verification record linked to a treasure, not an automatic authenticity/ownership/value assertion.

Build/research next in this order:

1. document SportsCardsPro API subscription/access, token handling, 1 req/sec limit, product/search response semantics, set/card/parallel ambiguity, and data-use constraints;
2. document PSA API authentication/token handling, cert response fields, API agreement constraints, and cert-verification truthfulness language;
3. decide whether sports-card catalog integration can be enabled only when a paid server-side token exists, with honest unavailable state otherwise;
4. define a provider-neutral **certification evidence** model separate from catalog evidence and provenance claims;
5. never store provider access tokens in browser code or logs;
6. never put SportsCardsPro price fields into catalog identity or authoritative Kingdom valuation;
7. never treat PSA cert lookup success as physical-slab authentication;
8. preserve provider/source/date/cert-number/returned-label metadata and explicit verification scope;
9. add review UI rather than automatic treasure mutation;
10. add provider/runtime/HTTP/Vault/UI regression tests before claiming support;
11. run full Kingdom quality gates and update this ledger before merge.

---

## Verified IMP-005 milestone checkpoints

- **Transactional migration:** Quality Gates #328 — PASS.
- **Royal Intake Queue:** Quality Gates #347 — PASS.
- **Progressive barcode scanner:** Quality Gates #361 — PASS.
- **ISBN catalog candidates:** Quality Gates #379 — PASS.
- **UPC/EAN/GTIN candidates:** Quality Gates #396 — PASS.
- **Provenance & Ownership Ledger:** Quality Gates #416 — PASS.
- **Cycle-safe reorganization domain:** Quality Gates #422 — PASS.
- **Live enhancement bootstrap:** Quality Gates #425 — PASS.
- **Authenticated reorganization PATCH API:** Quality Gates #433 — PASS.
- **Responsive reorganization controls:** Quality Gates #444 — PASS.
- **Previewed Atomic Bulk Treasure Reorganization:** final Quality Gates #460 — PASS.
- **Saved Vault Views + Large-Collection Retrieval:** final planner/index gate #475 — PASS.
- **Pokémon TCG Category Catalog Intelligence:** Quality Gates #480 — PASS.
- **Magic: The Gathering / Scryfall Category Catalog Intelligence:** Quality Gates #485 — PASS on `1301f2d4b49530f87ea99124ed202d2b9dcb2efc`.

---

## Known unfinished IMP-005 / later work

Do not represent these as live until separately implemented and verified:

- destructive bulk archive/delete flows;
- sports-card provider candidates;
- grading-company certification verification;
- multi-provider Pokémon reconciliation/fallback;
- fuzzy card-name/set disambiguation;
- Scryfall bulk-data local indexing;
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

Market value stays absent/null until backed by real valuation evidence. A barcode, image, AI answer, external catalog candidate, title match, ISBN, catalog ID, receipt, certificate number, grading label, Oracle ID, provider finish list, or collector-entered provenance statement is never silently upgraded into an authoritative independently verified claim. Certification-number lookup may verify database metadata for that number but must never silently authenticate the physical collectible. Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.
