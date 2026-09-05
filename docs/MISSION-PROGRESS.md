# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering recovery ledger. Read it before substantial implementation work and update it after every major verified code batch.

## Permanent execution rules

- The locked K.I.N.G.S. Collectibles construction documents are the primary product/construction guide.
- Research current competitors, official provider APIs, and data-use terms before each meaningful build pass.
- Adopt improvements only when they strengthen rather than silently replace the construction-document intent.
- Do not call functionality complete until it is real, wired, persistent/integrated where required, and supported by the strongest available quality gates.
- Preserve permanent Kingdom treasure identity across organization, provenance, Marketplace, grading, insurance, valuation, and legacy expansion.
- Never manufacture market values, identification certainty, provenance verification, grading certainty, physical authenticity, activity, or successful mutations.

---

## Current checkpoint

**Date:** 2026-09-05  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified checkpoint:** **PSA Certification-Database Evidence Boundary**  
**Latest verified implementation gate:** **Kingdom Quality Gates #490** — run `33973285905` — **PASS**  
**Verified implementation commit:** `85cbb9a78211dd2b09259ef088f88f8a1d59748b`  
**Working branch:** `imp-005-sports-card-cert-evidence`  
**Pull request:** `#13` — `IMP-005: PSA certification evidence boundary`

### Exact recovery point

Do **not** rebuild saved views, large-result pagination, bulk movement, provenance, Pokémon catalog intelligence, Scryfall/MTG intelligence, or the PSA certification provider/evidence UI.

The Royal Vault currently has verified:

- permanent owner-scoped treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collection groups and arbitrary-depth physical locations;
- secure private treasure media;
- voice command/talk-to-text;
- transactional JSON/CSV migration;
- Royal Intake Queue and progressive native barcode scanning;
- review-only Open Library ISBN evidence;
- review-only UPCitemdb UPC/EAN/GTIN evidence with commerce/price/image data excluded;
- append-only Provenance & Ownership Ledger;
- cycle-safe individual and previewed atomic bulk reorganization;
- private Saved Vault Views with deterministic keyset pagination and verified SQLite paging indexes;
- review-only Pokémon TCG exact-card evidence;
- review-only Magic: The Gathering exact-printing evidence via Scryfall;
- **review-only PSA certification-number database evidence when a server-side PSA token is configured**;
- **PSA cert numbers as their own Intake evidence type, intentionally not ordinary catalog/serial identity**;
- **responsive PSA database verification that cannot automatically hand off to treasure identity, grade, condition, authenticity, provenance, ownership, or value**;
- explicit separation among provider catalog identity, certification database records, physical authentication, provenance, ownership, and valuation.

### Construction-document guidance used for this pass

`K.I.N.G.S. Collectibles construction documents .pdf` remains authoritative.

The PSA/sports-card pass follows its requirements for evidence-backed intelligence, collector authority, server-side provider credentials, portable provider-independent treasure identity, mobile/Chromebook/desktop continuity, truthful uncertainty, and no silent authoritative mutation from an external lookup.

### Research completed for this pass

Pass-specific research record:

- `docs/research/2026-09-05-IMP-005-SPORTS-CARD-CERT-EVIDENCE.md`

Official sources reviewed included PSA Public API documentation, PSA's public Cert Verification security notice, SportsCardsPro API/CSV documentation, SportsCardsPro Terms of Service, and SportsCardsPro price-guide terms.

Key decisions:

- PSA exposes an official HTTPS Public API for single cert-number lookup and requires a bearer access token.
- PSA provider credentials stay server-side only.
- PSA's own public security notice warns that cert-number verification does not eliminate counterfeit risk and does not guarantee that a particular physical item/holder shown to a collector is genuine.
- Therefore a successful PSA result is `certification-database-record` evidence with `certificationNumberVerifiedInDatabase=true` while `physicalItemAuthenticated=false`.
- PSA cert numbers are not aliased to ordinary product catalog/serial identity.
- PSA estimate, sales, and pricing data are excluded from normalized Kingdom evidence.
- SportsCardsPro currently requires paid API access and documents a one-request-per-second API limit.
- SportsCardsPro's current terms restrict proprietary price-data use/redistribution in third-party-accessible software without express written permission.
- Therefore SportsCardsPro pricing is **not** wired as a default Kingdom valuation source. Any future adapter must be permission-aware and separate identification metadata from price/valuation authority.

### Latest implemented slice — PR #13

Primary files added/changed:

- `packages/catalog/src/psa-cert-provider.mjs`
- `packages/catalog/src/runtime.mjs`
- `packages/catalog/src/service.mjs`
- `config/runtime.mjs`
- `packages/vault/src/intake-service.mjs`
- `apps/web/public/vault-catalog-core.js`
- `apps/web/public/vault-intake-core.js`
- `apps/web/public/vault-intake-ui.js`
- `.env.example`
- `tests/psa-cert-provider.test.mjs`
- `tests/psa-intake.test.mjs`
- `tests/psa-evidence-ui.test.mjs`
- `tests/psa-intake-ui-artifact.test.mjs`
- `tests/catalog-runtime.test.mjs`
- `tests/catalog-runtime-wiring.test.mjs`
- `tests/config.test.mjs`
- `tests/vault-intake.test.mjs`
- `tools/typecheck.mjs`
- `tools/verify-build.mjs`
- `docs/research/2026-09-05-IMP-005-SPORTS-CARD-CERT-EVIDENCE.md`

Verified behavior:

- `psa-cert` validates and normalizes 1–12 digit certification numbers;
- aliases `psa` and `psa-certification` normalize to the same controlled Intake type;
- PSA cert numbers do not alias to ordinary catalog/serial identity for duplicate matching;
- official PSA API transport requires HTTPS outside local tests;
- bearer token is supplied only through server runtime configuration and never exposed in browser code/public source URLs/normalized evidence;
- the collector-facing source link points to PSA's normal public cert page, not the authenticated API endpoint;
- provider requests have bounded timeout and maximum response size;
- requests are serialized with a conservative default 1000 ms interval;
- PSA provider uses a 15-minute provider-specific cache instead of the generic six-hour catalog TTL;
- 204/404 no-data, invalid PSA request, rejected token, 429, upstream failure, malformed JSON/payload, oversized payload, and returned-cert mismatch remain explicit;
- bounded PSA/PSA-DNA metadata can include cert number, year/brand/category/card number/subject/variety, grade description/card grade, signer data, population values, item status, and PSA/DNA result metadata where returned;
- price/estimate/sales material is excluded from normalized evidence;
- database success explicitly records verification scope without claiming physical-holder authentication;
- runtime reports PSA capability as unavailable when no server-side token is configured rather than pretending access works;
- Royal Intake exposes `Verify PSA cert record` for PSA cert items;
- certification evidence cannot use ordinary `Use in treasure editor` or provider `Review in treasure editor` handoff;
- no automatic treasure identity, grade, condition, authenticity, provenance, ownership, purchase price, market value, or Vault mutation occurs.

Verification sequence:

- **Quality Gates #489** — run `33973247184` — **FAILED 1/153** because a newly added artifact test expected the policy-owned text `Verify PSA cert record` to be duplicated inside `vault-intake-ui.js`. Provider, Intake, runtime, domain, and truthfulness behavior passed.
- The artifact test was corrected to inspect the actual module boundary: the policy label in `vault-catalog-core.js` and certification-only behavior in `vault-intake-ui.js`. No production behavior was weakened or duplicated merely to satisfy the test.
- **Quality Gates #490** — run `33973285905` — **PASS** on `85cbb9a78211dd2b09259ef088f88f8a1d59748b`.
- #490 passed lint, type contracts, all **153 tests**, production build/artifact verification, and production dependency audit.

---

## Exact next engineering target

**IMP-005 — Sports-Card Identity Evidence + Additional Grading-Provider Verification Research**

Do not start with a price feed. First identify lawful, current evidence sources and preserve the existing authority boundaries.

Build/research next in this order:

1. research current official verification/API options and terms for other major grading providers such as BGS, SGC, CGC and other relevant graders;
2. add another grader only if current official access can support a production verification flow without scraping or invented capability;
3. preserve the same certification-database-record versus physical-authentication boundary used for PSA;
4. research sports-card catalog **identity** providers separately from valuation providers, including card number, set, player/subject, parallel/variant and provider identifiers;
5. if SportsCardsPro remains a candidate, require explicit licensing/permission appropriate to the Kingdom's intended distribution before surfacing proprietary price data;
6. keep all provider credentials server-side and capability status honest when credentials/subscriptions are absent;
7. do not map price fields into catalog identity or authoritative value;
8. do not let a cert lookup silently set grade or authenticity on a treasure;
9. extend provider-neutral evidence service rather than creating a second subsystem;
10. add provider/runtime/HTTP/Intake/UI/artifact regression tests;
11. pass full Kingdom Quality Gates;
12. update README and this recovery ledger before merge.

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
- **Magic: The Gathering / Scryfall Catalog Intelligence:** Quality Gates #485 and later regression gates — PASS.
- **PSA Certification-Database Evidence Boundary:** Quality Gates #490 — run `33973285905` — PASS on `85cbb9a78211dd2b09259ef088f88f8a1d59748b`.

---

## Known unfinished IMP-005 / later work

Do not represent these as live until separately implemented and verified:

- destructive bulk archive/delete flows;
- sports-card catalog provider candidates beyond existing generic retail/card paths;
- grading-company verification beyond PSA;
- automatic physical slab authentication;
- multi-provider Pokémon reconciliation/fallback;
- fuzzy card-name/set/parallel disambiguation;
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

Market value stays absent/null until backed by real, legally usable valuation evidence. A barcode, image, AI answer, external catalog candidate, title match, ISBN, catalog ID, receipt, certificate number, grading label, Oracle ID, provider finish list, or collector-entered provenance statement is never silently upgraded into an authoritative independently verified claim. Certification-number lookup may verify database metadata for that number but must never silently authenticate the physical collectible. Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.
