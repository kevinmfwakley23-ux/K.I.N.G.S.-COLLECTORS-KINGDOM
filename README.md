# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging, locating, documenting, researching, protecting, grading-prep, and eventually buying, selling, trading, valuing, insuring, and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified implementation checkpoint:** exact, review-only sports-card catalog evidence via The Card API, alongside the already verified Royal Vault, Intake, scanner, provenance, saved-view/paging, bulk-reorganization, Pokémon, Magic/Scryfall, and PSA certification-evidence slices.

**Latest verified gate:** **Kingdom Quality Gates #495** — run `33974730681` — **PASS** on implementation commit `e51c0751675746e3d9b3fa22f97815dd1450df2b`.

The sports-card provider supports permanent The Card API UCIDs and exact set-USID/printed-card-number lookup. The referenced set is independently verified and must be classified by the provider as `sports`. Credentials remain server-only, paid Catalog entitlement is not falsely inferred from key presence, exact ambiguity fails closed, and The Card API Market/Sales price data is deliberately excluded from this identity path.

A returned sports-card candidate is **review evidence**, not proof that the collector's physical card is the exact printing/parallel and not proof of condition, grade, authenticity, provenance, ownership, or value. Candidate evidence can be copied only into a new unsaved treasure editor; no authoritative record is silently changed.

### Newly locked product requirement — AI card pre-grading

The Kingdom will include **AI-assisted card pre-grading/condition analysis**. This is a real measurement and evidence system, not a fake official grade generator.

The target capability includes:

- card-size/calibration profiles for standard western trading cards and Japanese-size TCG cards;
- front/back border and centering measurement with left/right/top/bottom ratios;
- grader-profile comparison for PSA/BGS/CGC-style thresholds without claiming affiliation or official grading;
- individual corner analysis;
- edge/chipping/roughness analysis;
- surface scratch, scuff, print-line, crease, wrinkle, stain and dent evidence;
- color/fading, gloss and registration review where image quality allows;
- possible trimming/recoloring/restoration/cleaning warning signals where detectable;
- an image-quality capture protocol including straight-on, macro corner, and raking-light views;
- transparent sub-scores, estimated grade **range**, confidence and limitations;
- autograph scan isolation and sourced similarity comparison against lawful known-reference signatures available through web/reference research;
- explicit separation between **AI autograph comparison** and professional autograph authentication.

PSA and Beckett describe professional autograph authentication as involving more than visual similarity, including ink/structure analysis, side-by-side exemplars, object evaluation and specialized inspection tools. The Kingdom therefore will never call an autograph genuine merely because AI finds a visual match.

Research record: `docs/research/2026-09-05-IMP-005-AI-CARD-PREGRADING.md`.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — recoverable build state, verified checkpoints, blockers and exact next target.
- [`docs/research/`](docs/research/) — dated provider, competitor, standards and technical research.

After each substantial verified code batch, `docs/MISSION-PROGRESS.md` must be updated so work can resume from the repository rather than relying on chat history.

## Permanent engineering rules

- The locked K.I.N.G.S. construction documents remain the primary product guide.
- Research current competitors, open-source patterns, official APIs and provider terms before meaningful integration work.
- Build real executable functionality; never present simulated integrations, mock totals, fake market data, placeholder AI, or decorative-only interfaces as complete.
- Never commit secrets or expose provider credentials in browser code.
- Preserve collector authority over destructive, ownership-changing, grading, authentication and authoritative record actions.
- External catalog results, AI analysis and image similarity must surface uncertainty instead of silently inventing identity, physical variant, condition, grade, authenticity, provenance or value.
- Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.
- Mobile, Android, Chromebook, tablet and desktop workflows are first-class.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared intelligence/router core for the K.I.N.G.S. application family. Collector's Kingdom owns collector identity, authorization, Vault records, Marketplace rules, ownership state and product actions. Model/provider routing stays behind the governed server-to-server K.I.N.G.S. AI boundary.

The Keeper can advise through K.I.N.G.S. AI, including future vision/pre-grading workflows, but Collector's Kingdom and the collector remain the authority for record mutation.

## Royal Vault — verified capability

Current verified Vault capability includes:

- permanent owner-scoped treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collections and arbitrary-depth physical storage locations;
- responsive collection/location editing with cycle protection;
- previewed atomic bulk movement of up to 100 treasures;
- private Saved Vault Views storing query/filter/sort definitions rather than frozen results;
- deterministic keyset pagination with bounded pages and verified paging indexes;
- secure private treasure media;
- structured condition/variant/quantity/acquisition/cost/identifier/custom attributes;
- duplicate-review warnings and normalized search/filter/sort;
- append-only audit/provenance history;
- real statistics and currency-separated purchase totals;
- portable versioned JSON export;
- transactional review-first JSON/CSV migration;
- Royal Intake Queue with repeated-capture counts and preserved dismissed history;
- progressive native camera barcode scanning where the browser supports `BarcodeDetector`;
- voice navigation, Keeper questions, Vault search and talk-to-text where browser speech recognition is available.

## Review-only external evidence

The provider-neutral evidence boundary currently supports:

- **Open Library** — checksum-valid ISBN/book candidates;
- **UPCitemdb** — checksum-valid UPC/EAN/GTIN retail identification candidates;
- **Pokémon TCG API** — exact card ID or explicit set-ID/card-number candidates;
- **Scryfall** — exact Magic printing UUID or set-code/collector-number candidates;
- **The Card API** — exact sports-card UCID or set-USID/printed-card-number candidates when eligible server-side Catalog access is configured;
- **PSA Public API** — exact certification-number database evidence when a server-side token is configured.

All of these paths are authenticated, bounded and review-only. Provider IDs remain supporting evidence rather than permanent Kingdom physical identity. Identification-provider price/commerce material, The Card API Market/Sales data and PSA estimate/sales data do not become Kingdom valuation through these paths.

### Sports-card identity evidence

Verified through **Quality Gates #495**:

- permanent UCID normalization;
- exact set-USID + printed-number lookup;
- independent sports-category verification of the referenced set;
- server-only API key and HTTPS outside local tests;
- preserved `/api/v1` provider path;
- bounded timeout/response size and serialized request pacing;
- explicit configuration, paid-plan, auth, rate-limit, upstream, malformed, category-mismatch, identifier-mismatch and ambiguity failures;
- no sales/market-price/image import;
- Royal Intake integration;
- responsive review-only candidate handoff into a new unsaved Trading Card editor;
- no automatic physical parallel/variant/finish, condition, grade, authenticity, provenance, ownership or value mutation.

Research: `docs/research/2026-09-05-IMP-005-THE-CARD-API-SPORTS-CATALOG.md`.

### PSA certification evidence

PSA certification lookup remains a separate evidence class. A matching database record can verify that PSA returned information for a certification number; it does **not** by itself authenticate the physical slab/card being presented. The Kingdom does not automatically copy PSA evidence into treasure grade, condition, authenticity, provenance, ownership or value.

## Truthfulness boundary

Market value remains absent until a real, legally usable valuation system is implemented. A barcode, image, title match, provider result, AI suggestion, cert number, grading label, autograph similarity result, catalog ID or collector-entered provenance statement is not automatically authoritative.

Likewise, a future AI pre-grade is an **estimated condition analysis** based on captured evidence. It must remain distinct from an official PSA/BGS/CGC/SGC grade, from professional autograph authentication, and from physical-card authentication.

## Current next target

**IMP-005 — AI Card Pre-Grading Foundation.**

Build the first verified slice in this order:

1. versioned grading-standard and card-size profiles;
2. deterministic centering/border math with manual-anchor correction and tests;
3. capture-quality contract for front/back, corners and raking-light surface images;
4. append-only pre-grade analysis record tied to treasure/media evidence;
5. image-analysis provider boundary suitable for browser/local CV and governed K.I.N.G.S. AI vision routing;
6. corner/edge/surface/color defect evidence contracts;
7. autograph comparison evidence with sourced reference exemplars and a strict non-authentication label;
8. responsive mobile-first review UI;
9. full Kingdom Quality Gates;
10. update README and mission-progress ledger before merge.

Later separate milestones remain: lawful evidence-backed market valuation/value history, image-based collectible identification, insurance/reporting expansion, additional official grader integrations, Marketplace ownership transfer/settlement, and destructive bulk archive/delete flows.
