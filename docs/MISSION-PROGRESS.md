# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering recovery ledger. Read it before substantial implementation work and update it after every major verified code batch.

## Permanent execution rules

- The locked K.I.N.G.S. Collectibles construction documents are the primary product/construction guide.
- Research current competitors, official provider APIs and data-use terms before meaningful build work.
- Adopt improvements only when they strengthen rather than silently replace product intent.
- Do not call functionality complete until it is real, wired and verified through the strongest relevant gates.
- Preserve permanent Kingdom treasure identity across organization, provenance, grading, Marketplace, insurance, valuation and legacy expansion.
- Never manufacture market values, identification certainty, grading certainty, physical authenticity, provenance verification or successful mutations.

---

## Current checkpoint

**Date:** 2026-09-05  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified checkpoint:** **Exact Sports-Card Catalog Evidence via The Card API**  
**Latest verified implementation gate:** **Kingdom Quality Gates #495** — run `33974730681` — **PASS**  
**Verified implementation commit:** `e51c0751675746e3d9b3fa22f97815dd1450df2b`  
**Working branch:** `imp-005-the-card-api-sports-catalog`  
**Pull request:** `#14` — `IMP-005: exact sports-card catalog evidence`

### Exact recovery point

Do **not** rebuild the following verified IMP-005 slices:

- permanent owner-scoped treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collections and arbitrary-depth physical storage;
- secure private media;
- voice command/talk-to-text;
- transactional JSON/CSV migration;
- Royal Intake Queue and progressive native barcode scanning;
- review-only Open Library ISBN evidence;
- review-only UPCitemdb UPC/EAN/GTIN evidence;
- append-only Provenance & Ownership Ledger;
- cycle-safe individual and previewed atomic bulk reorganization;
- private Saved Vault Views and deterministic keyset pagination with verified SQLite paging indexes;
- review-only Pokémon exact-card evidence;
- review-only Magic exact-printing evidence via Scryfall;
- review-only PSA certification-number database evidence;
- review-only exact sports-card catalog evidence via The Card API.

### Latest sports-card slice

Primary implementation files include:

- `packages/catalog/src/the-card-api-provider.mjs`
- `packages/catalog/src/runtime.mjs`
- `packages/catalog/src/service.mjs`
- `config/runtime.mjs`
- `packages/vault/src/intake-service.mjs`
- `apps/web/public/vault-catalog-core.js`
- `apps/web/public/vault-intake-core.js`
- `apps/web/public/vault-intake-ui.js`
- `.env.example`
- provider/runtime/Intake/UI/build-contract tests
- `docs/research/2026-09-05-IMP-005-THE-CARD-API-SPORTS-CATALOG.md`

Verified behavior:

- permanent `UC-` sports-card UCIDs normalize and validate before network use;
- exact set/card lookup uses provider set USID + printed card number;
- the card's referenced set is independently fetched and must have provider category `sports`;
- external HTTP is forbidden outside localhost tests; production transport is HTTPS;
- the API key is server-only and sent through `x-api-key` rather than URLs/browser code;
- `/api/v1` is preserved by explicit provider path joining;
- timeout, response size and request pacing are bounded;
- exact-result ambiguity fails instead of silently selecting a card;
- configuration-required, paid-plan/subscription-required, rate-limit, auth, upstream, malformed, category mismatch and identifier mismatch failures stay distinct;
- provider catalog entitlement is **not** claimed at startup merely because a key exists;
- normalized evidence may include subject/player, set/parent set, printed number, sport/year, manufacturer, rookie/autograph/relic flags, print run and provider IDs;
- Market/Sales endpoints, sale prices, market prices, listing data, valuation and provider images are excluded from this identification path;
- Royal Intake supports `sports-card-ucid` and `sports-card-set-number` as duplicate-review evidence;
- candidate handoff creates only a **new unsaved** Trading Card editor;
- no automatic physical parallel/variant/finish, condition, grade, authenticity, provenance, ownership, purchase price, market value or Marketplace mutation occurs.

### Verification sequence

- **Quality Gates #494** — run `33974619115` — failed **1/167** because an older Magic UI artifact test required the literal phrase `physical variant or finish`; the new shared warning had changed that phrase to sports-card `variant or parallel` language.
- Production/provider logic was not weakened. The shared warning was corrected to preserve **both** Magic `variant or finish` and sports-card `variant or parallel` review concepts.
- **Quality Gates #495** — run `33974730681` — **PASS** on `e51c0751675746e3d9b3fa22f97815dd1450df2b`.
- #495 passed lint, type contracts, all tests, production build/artifact verification and production dependency audit.

### Provider/legal research outcome

- The Card API currently offers permanent typed identifiers and a commercial Catalog API under eligible paid plans/add-ons with plan-specific storage/use restrictions.
- The Kingdom treats it as an optional server-side integration and does not redistribute the provider catalog as a standalone competing dataset.
- Beckett, SGC and CGC provide collector-facing certification verification, but no supported public automation API was identified in the official material reviewed for this pass; do not scrape/bypass those interfaces.
- SportsCardsPro/PriceCharting proprietary price data remains excluded as a default Kingdom valuation source without appropriate permission for third-party-accessible use.

---

## Newly locked requirement — AI card pre-grading

The collector has explicitly required AI grading capability including:

- border-size and centering tools for TCG/sports cards;
- corner checks;
- edge checks;
- scratch/surface checks;
- color/fading checks;
- autograph knowledge and scan-to-reference comparison using lawful web access/reference evidence.

Pass-specific research record:

- `docs/research/2026-09-05-IMP-005-AI-CARD-PREGRADING.md`

### Standards research completed

Official sources reviewed:

- PSA grading standards;
- Beckett/BGS grading scale and four-subgrade model;
- CGC Cards grading scale;
- PSA autograph authentication process;
- Beckett Authentication autograph process;
- trading-card physical-size references for standard western and Japanese-size cards.

Key decisions:

- the Kingdom feature is named **AI pre-grade**, **condition analysis**, or **estimated grade range**, not an official grade;
- versioned grader profiles may expose PSA/BGS/CGC-style thresholds, but the Kingdom must not claim affiliation or certainty beyond the published criteria and captured evidence;
- centering must measure horizontal and vertical ratios independently and preserve front/back results;
- western standard cards use a common approximately 63×88 mm / 2.5×3.5 in calibration profile; Japanese-size cards use approximately 59×86 mm; actual image geometry still controls measurement;
- borderless/asymmetric designs require a known reference template or collector-correctable manual anchors rather than naive outer-border math;
- corners, edges and surface retain independent evidence/sub-scores;
- fine scratches, gloss changes, dents, restoration and alteration can require macro/raking/spectral views, so low-quality phone images must produce limitations rather than false confidence;
- professional autograph authentication uses more than visual similarity. PSA and Beckett describe ink/structure analysis, object evaluation, side-by-side exemplars and specialized tools;
- the Kingdom may perform sourced **signature similarity comparison** against known exemplars but may not call a signature genuine/fake solely from AI image comparison.

### Target capture protocol

The grading workflow should request, where appropriate:

1. straight-on front;
2. straight-on back;
3. high-resolution corner/macro evidence;
4. raking-light surface views from multiple directions;
5. optional alternate-light/UV evidence when available;
6. autograph close-up when present;
7. optional scale/calibration reference for exact-size/trimming review.

Capture quality must be checked for blur, glare, crop completeness, perspective and resolution before analysis.

---

## Exact next engineering target

**IMP-005 — AI Card Pre-Grading Foundation**

Build next in this order:

1. add `packages/grading/` with versioned card-size and grader-standard profiles;
2. implement deterministic centering math for left/right and top/bottom borders with front/back ratios and tests;
3. add manual-anchor correction support for borderless/asymmetric/poorly detected cards;
4. define capture-quality and defect evidence contracts for corners, edges, surface, color and alteration warnings;
5. create an append-only pre-grade analysis repository tied to permanent treasure UUIDs and source media IDs/hashes;
6. add an image-analysis provider boundary that can use browser/local computer vision and governed K.I.N.G.S. AI vision routing without exposing provider credentials;
7. add autograph-comparison evidence with sourced reference exemplar URLs/dates and strict non-authentication semantics;
8. build responsive mobile-first grading capture/review UI;
9. do not directly mutate authoritative treasure grade, condition, authenticity, provenance or value from AI analysis;
10. pass full Kingdom Quality Gates;
11. update README and this recovery ledger before merge.

---

## Verified IMP-005 milestone checkpoints

- Transactional migration — Quality Gates #328 — PASS.
- Royal Intake Queue — #347 — PASS.
- Progressive barcode scanner — #361 — PASS.
- ISBN catalog candidates — #379 — PASS.
- UPC/EAN/GTIN candidates — #396 — PASS.
- Provenance & Ownership Ledger — #416 — PASS.
- Reorganization domain/API/UI — #422 through #444 — PASS.
- Previewed Atomic Bulk Treasure Reorganization — final #460 — PASS.
- Saved Vault Views + Large-Collection Retrieval — final planner/index gate #475 — PASS.
- Pokémon TCG Category Catalog Intelligence — #480 — PASS.
- Magic / Scryfall Catalog Intelligence — #485 and later regression gates — PASS.
- PSA Certification-Database Evidence — #490 — PASS.
- Exact Sports-Card Catalog Evidence / The Card API — #495 — run `33974730681` — PASS on `e51c0751675746e3d9b3fa22f97815dd1450df2b`.

---

## Known unfinished IMP-005 / later work

Do not represent these as live until separately implemented and verified:

- AI card pre-grading/condition analysis UI and persistence;
- automatic border/corner/edge/surface/color computer vision;
- autograph similarity comparison and sourced exemplar retrieval;
- official grading-provider integrations beyond PSA certification database evidence;
- physical slab/card authentication;
- evidence-backed market valuation and value history;
- image-based collectible identification;
- multi-provider Pokémon reconciliation/fallback;
- fuzzy card/set/parallel discovery;
- comic/video-game/vinyl provider candidates;
- insurance/reporting expansion beyond portable JSON export;
- universal camera scanning where browser native APIs are absent;
- universal speech recognition where browser speech APIs are absent;
- destructive bulk archive/delete;
- Marketplace ownership transfer/settlement.

### Permanent truthfulness boundary

A catalog result, AI pre-grade, photograph, autograph similarity result, barcode, title match, grading label, cert number or collector statement is not silently promoted into an authoritative independent claim. AI grading is estimated condition evidence; professional grading and autograph authentication remain separate authorities. Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.
