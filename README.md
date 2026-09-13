# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is a collector-first system for cataloging, locating, documenting, researching, protecting, grading-prep, valuing, and ultimately buying, selling, trading, insuring and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

**Production baseline:** Marketplace discovery commit `cbaf9663d0066ee7b91118e40595cfe68c7c43ae` — Kingdom Quality Gates #718 PASS.  
**Active closeout:** PR #34 — Collector-Owned Insurance Preparation Reporting.  
**Verified implementation head:** `1dd07abfe4536cd34024fc8011b2d423549e691e` — Kingdom Quality Gates #720 / run `34761273273` PASS before documentation closeout.  
**Current milestone:** IMP-005 — Royal Vault, Phase 1 completion candidate.

PR #34 is deliberately built on top of the Marketplace-enabled production baseline rather than an older Vault snapshot. Its implementation passed exact dependency installation, lint, type contracts, all 336 tests, production build verification, Marketplace production verification and the production dependency audit with zero reported vulnerabilities. This README and `docs/MISSION-PROGRESS.md` are the final documentation closeout; the documented head must pass the complete gate again before merge.

## Permanent truth boundary

The Kingdom never silently upgrades evidence into authoritative truth.

- A provider match does not become permanent physical-item identity.
- An AI pre-grade is not an official PSA/BGS/CGC/SGC grade.
- Autograph image similarity is not professional authentication.
- Collector-recorded provenance is not independently verified unless a separate authority verifies it.
- A sold comparable or asking listing is not automatically authoritative market value.
- A provider observation remains evidence, not an automatic appraisal.
- A collector's own realized sale is historical lifecycle evidence, not automatically a current market comparable.
- A Kingdom valuation, portfolio estimate or insurance-preparation report is advisory/documentary evidence, not an appraisal or guaranteed sale/replacement value.
- A Marketplace click, listing or publication event is never a sale and never transfers authoritative Vault ownership.
- No grading, valuation, catalog, AI, provenance or Marketplace subsystem may silently overwrite ownership or permanent physical treasure identity.

Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.

## Royal Vault — verified production capability

The verified Royal Vault includes:

- owner-scoped permanent treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive with archive-based safe removal;
- collections and arbitrary-depth physical storage locations;
- cycle-safe collection/location editing and previewed atomic bulk movement;
- private Saved Vault Views and deterministic keyset pagination with verified indexes;
- secure private media with SHA-256 integrity metadata;
- structured condition, variant, quantity, acquisition, cost, identifiers and custom attributes;
- first-class validated Year metadata and normalized owner-scoped collector Tags;
- Year/Tag filtering, sorting, text discovery, saved-view support and transactional import/export preservation;
- review-first JSON/CSV import and portable versioned export;
- Royal Intake Queue and progressive native camera barcode capture where supported;
- voice navigation, Keeper questions, Vault search and talk-to-text where browser speech recognition exists;
- append-only provenance/ownership history;
- review-only external catalog/certification evidence;
- append-only AI pre-grade evidence and finding-review history;
- calibrated physical-measurement evidence, macro corner/edge evidence and paired-surface analysis;
- append-only valuation evidence with strict sold-vs-asking separation;
- provider-originated valuation observations with provider/policy/retrieval identity;
- derived realized-sale/value-history linkage with exact source-record references;
- evidence-backed collection portfolio coverage and separate per-currency rollups;
- immutable portfolio valuation snapshots with SHA-256 integrity checks;
- persistent per-currency collection-value history with exact evidence IDs;
- bounded collection/time-range history and cause-aware portfolio change summaries;
- Keeper valuation/history explanations with exact snapshot, valuation-evidence and realized-sale provenance citations;
- accessible 30D/90D/1Y/All-history charts that preserve evidence gaps rather than manufacturing zeroes.

### Collector-owned insurance preparation reporting — PR #34

The closeout slice adds a private owner-controlled evidence package designed to help a collector document a collection without pretending the Kingdom is an insurer or professional appraiser.

Verified behavior includes:

- authenticated owner-scoped JSON evidence download and print-friendly HTML report;
- report scope over the active Vault, one collection or explicit treasure IDs;
- archived treasures excluded unless the collector explicitly opts in;
- permanent treasure UUID, Year/Tags, quantity, condition, collection/storage context and recorded acquisition facts;
- private media references with SHA-256 integrity metadata while storage keys remain private;
- exact provenance event IDs and recorded lifecycle facts;
- current evidence-backed advisory valuation contribution with exact valuation evidence IDs;
- exact portfolio snapshot ID, generation time and SHA-256 citation;
- recorded acquisition/disposition facts kept visibly separate from advisory estimates;
- per-currency totals only with no automatic FX or cross-currency grand total;
- deterministic report SHA-256 integrity digest;
- unsupported valuation shown as unavailable rather than manufactured as zero;
- explicit non-appraisal, non-guaranteed insurer acceptance and non-guaranteed replacement/sale-value language;
- `no-store` private report responses;
- print/mobile/focus/reduced-motion accommodations and browser Print / Save as PDF workflow;
- no destructive mutation during report generation;
- invalid formats rejected before report generation or snapshot capture.

Research and trust decisions: [`docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md`](docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md).

## Marketplace — production foundation

The production baseline already contains the Kingdom Street Market fixed-price listing and discovery foundation.

Verified behavior includes:

- private Vault-linked seller drafts;
- explicit possession, right-to-sell and accuracy attestations before publication;
- quantity validation against current Vault possession;
- immutable published representation hashes;
- sanitized public active-offer discovery that does not expose private Vault ownership/storage data;
- fail-closed suppression when the Vault treasure is archived or quantity no longer supports the offer;
- authenticated seller stall/listing history;
- seller withdrawal without automatic ownership transfer;
- searchable discovery with accent-insensitive multi-field matching;
- live category/currency/fulfillment facets;
- currency-safe price filtering and sorting;
- shareable responsive filter state;
- Great Hall/Keeper Marketplace availability context.

The Marketplace intentionally does **not** claim live checkout, payments, escrow, settlement, payouts, KYC approval, tax handling, shipping labels, buyer protection, refunds/disputes, auctions, trades or authoritative ownership transfer yet.

Marketplace recovery ledger: [`docs/MARKETPLACE-PROGRESS.md`](docs/MARKETPLACE-PROGRESS.md).

## Evidence-backed valuation rules

Current valuation behavior is deliberately conservative:

- append-only owner-scoped valuation evidence tied to permanent treasure UUIDs;
- separate sold-comparable and asking-listing evidence;
- source/reference, observed date, integer minor-unit amount and explicit currency;
- SHA-256 integrity verification;
- linked append-only corrections rather than destructive history rewrite;
- provider evidence protected from collector rewrite;
- strict currency and condition/grade buckets;
- 180-day freshness for current sold evidence;
- minimum three compatible recent sold comparables before a current estimate exists;
- median advisory estimate with visible range/sample/source/confidence context;
- asking listings excluded from the sold-comparable estimate;
- realized owner sales retained as lifecycle history but excluded from the current comparable estimate;
- no automatic FX conversion;
- no mutation of authoritative treasure value, grade, condition, authenticity, provenance or ownership.

### First official network valuation adapter

The eBay Browse integration uses the official Buy/Browse API with application OAuth and treats active Browse results as asking evidence only.

Enable only when all three reviewed deployment values exist:

```env
KINGDOM_EBAY_CLIENT_ID=...
KINGDOM_EBAY_CLIENT_SECRET=...
KINGDOM_EBAY_PROVIDER_POLICY_ID=...
```

Optional configuration:

```env
KINGDOM_EBAY_API_BASE_URL=https://api.ebay.com
KINGDOM_EBAY_MARKETPLACE_ID=EBAY_US
KINGDOM_EBAY_TIMEOUT_MS=5000
```

No scraping workaround is used for restricted or unavailable sold-history access.

## Review-only external evidence

Provider-neutral identification/certification evidence currently supports:

- **Open Library** — ISBN/book candidates;
- **UPCitemdb** — UPC/EAN/GTIN retail candidates;
- **Pokémon TCG API** — exact card or set/card-number candidates;
- **Scryfall** — exact Magic printing UUID or set/collector-number candidates;
- **The Card API** — eligible exact sports-card catalog evidence;
- **PSA Public API** — exact certification-number database evidence when configured;
- **Wikimedia Commons / MediaWiki API** — autograph reference-image candidates with source/license metadata.

Provider IDs remain supporting evidence rather than permanent Kingdom physical identity. Identification-provider prices do not silently become valuation evidence.

## Shared K.I.N.G.S. AI boundary

K.I.N.G.S. AI is the shared intelligence/router core for the K.I.N.G.S. application family. Collector's Kingdom owns collector identity, authorization, Vault records, Marketplace rules, ownership state and product actions. Model/provider routing stays behind the governed server-to-server K.I.N.G.S. AI boundary.

The Keeper may advise through K.I.N.G.S. AI, but Collector's Kingdom and the collector remain the authority for record mutation.

## Official brand and install surface

The product-owner supplied Collector's Kingdom crest is the canonical brand asset and is wired into the landing page, Royal Gate, Great Hall, Royal Vault, castle rooms, Marketplace route and install metadata.

The current install surface is a real PWA. Its service worker is static-only and excludes `/api/` traffic and document navigations so authenticated records/evidence are not silently cached.

This is **not** a claim that a signed native Android APK is already complete. Native packaging, signing and device verification remain separate milestones.

## Run the Kingdom

Requirements:

- Node.js 22.13+;
- npm;
- runtime write access to `KINGDOM_DATA_DIR`.

Install exact dependencies:

```bash
npm ci --ignore-scripts
```

Run locally:

```bash
npm start
```

Default local address:

```text
http://127.0.0.1:8788
```

Run the full production-quality gate:

```bash
npm run verify
npm audit --omit=dev --audit-level=high
```

Build and run the production artifact:

```bash
npm run build
npm run start:prod
```

The production build manifest identifies `apps/web/runtime.mjs` as the real wired entrypoint.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — recoverable build state, verified checkpoints, blockers and exact next target.
- [`docs/MARKETPLACE-PROGRESS.md`](docs/MARKETPLACE-PROGRESS.md) — Street Market recovery ledger and intentionally unfinished transaction boundary.
- [`docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md`](docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md) — insurance/documentation research and report trust rules.
- [`docs/research/2026-09-13-IMP-005-VAULT-YEAR-TAGS.md`](docs/research/2026-09-13-IMP-005-VAULT-YEAR-TAGS.md) — Year/Tags research and metadata design.
- [`docs/research/2026-09-13-IMP-005-COLLECTION-VALUE-HISTORY.md`](docs/research/2026-09-13-IMP-005-COLLECTION-VALUE-HISTORY.md) — portfolio-history research and evidence/cause design.
- [`docs/research/`](docs/research/) — dated competitor, provider, standards and technical research.

Documentation is part of implementation. Substantial verified build batches must update the relevant recovery ledger before integration.

## Permanent engineering rules

- The locked K.I.N.G.S. construction documents remain the primary product guide.
- Research current competitors, open-source patterns, official APIs and provider terms before meaningful integration work.
- Build executable functionality; never present simulated integrations, mock totals, fake market data or decorative-only interfaces as complete.
- Never commit secrets or expose provider credentials in browser code.
- Preserve collector authority over destructive, ownership-changing, grading, authentication and authoritative record actions.
- External evidence must surface uncertainty instead of silently inventing identity, variant, condition, grade, authenticity, provenance or value.
- Mobile, Android, Chromebook, tablet and desktop workflows are first-class.

## Exact next engineering target

1. Re-run the complete Kingdom Quality Gate on this documented PR #34 head.
2. Merge PR #34 only if lint, type contracts, all tests, production build/artifact checks, Marketplace verification and the production dependency audit stay green.
3. Treat that merge as the Royal Vault Phase 1 completion checkpoint unless the final reconciliation exposes a locked IMP-005 gap.
4. Advance the already-integrated Street Market from discovery into **private saved searches + bounded cursor pagination** before transaction code.
5. Keep notifications explicitly unavailable until a real delivery service exists.
6. Only after discovery/retrieval is durable, begin a separately governed Safeguarded Transaction Foundation covering seller eligibility/KYC boundaries, order-state authority, idempotency, payment/webhook authority, tax/shipment evidence, cancellation/refunds/disputes, fraud controls, settlement and the exact verified condition that may authorize provenance append + Vault ownership transfer.

The guiding Marketplace rule remains: **a click is never a sale; ownership changes only after a separately verified transaction state authorizes it.**
