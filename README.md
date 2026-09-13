# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is a collector-first system for cataloging, locating, documenting, researching, protecting, grading-prep, valuing, and ultimately buying, selling, trading, insuring and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

**Production `main`:** `08a743abda8aaee14e3f7a852069964df119c7f2` — Marketplace private saved searches + bounded query-bound pagination merged from PR #35.  
**Royal Vault Phase 1:** completed and integrated, including collector-owned insurance-preparation evidence reporting from PR #34.  
**Active closeout:** PR #36 — private Marketplace watchlists + explicit opt-in seller storefronts.  
**Verified implementation head:** `2224ed115cff86fa0513b2a56ff8932fcd8fd651` — Kingdom Quality Gates #737 / run `34762428847` PASS, including the production dependency audit.  
**Next major engineering target after PR #36:** Safeguarded Transaction Foundation.

The current PR remains unmerged until this documentation closeout is itself re-run through the complete Kingdom quality gate. A passing implementation gate is not treated as permission to skip final documented-head verification.

## Permanent truth boundary

The Kingdom never silently upgrades evidence or intent into authoritative truth.

- A provider match does not become permanent physical-item identity.
- An AI pre-grade is not an official PSA/BGS/CGC/SGC grade.
- Autograph image similarity is not professional authentication.
- Collector-recorded provenance is not independently verified unless a separate authority verifies it.
- A sold comparable or asking listing is not automatically authoritative market value.
- A provider observation remains evidence, not an automatic appraisal.
- A collector's own realized sale is historical lifecycle evidence, not automatically a current market comparable.
- A Kingdom valuation, portfolio estimate or insurance-preparation report is advisory/documentary evidence, not an appraisal or guaranteed sale/replacement value.
- A Marketplace listing, search, saved search, watch, storefront view, click or publication event is never a sale and never transfers authoritative Vault ownership.
- No grading, valuation, catalog, AI, provenance or Marketplace subsystem may silently overwrite ownership or permanent physical treasure identity.

Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.

## Royal Vault — verified production capability

The integrated Royal Vault includes:

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
- accessible 30D/90D/1Y/All-history charts that preserve evidence gaps rather than manufacturing zeroes;
- authenticated owner-scoped insurance-preparation JSON/print reports with exact evidence/provenance/snapshot references, separate currencies and deterministic report integrity hashes.

Insurance-preparation output explicitly remains documentation rather than an appraisal, insurer guarantee, replacement-value guarantee or sale-price guarantee.

Research: [`docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md`](docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md).

## Kingdom Street Market — integrated production foundation

Production `main` currently contains:

- private Vault-linked seller drafts;
- explicit possession, right-to-sell and accuracy attestations before publication;
- quantity validation against current Vault possession;
- immutable published representation hashes;
- sanitized public active-offer discovery that does not expose private Vault ownership/storage data;
- fail-closed suppression when a Vault treasure is archived or quantity no longer supports an offer;
- authenticated seller stall/listing history;
- seller withdrawal without automatic ownership transfer;
- accent-insensitive multi-field search;
- live category/currency/fulfillment facets;
- currency-safe price filtering and sorting;
- shareable responsive filter state;
- bounded deterministic public discovery pagination;
- query-bound cursors that cannot be replayed against changed filters/sorts;
- private owner-scoped saved searches storing search definitions rather than frozen result snapshots;
- saved searches that rerun against current supported market state;
- explicit no-notification boundary until a real notification-delivery service exists;
- Great Hall/Keeper Marketplace availability context.

### PR #36 — verified engagement completion candidate

The active branch adds two deliberately non-transactional Marketplace capabilities:

- **Private buyer watchlists** — authenticated, owner-isolated, idempotent, bounded, no reservation/order/purchase commitment, no alerts, and unavailable tombstones when an offer is withdrawn or no longer publicly supported.
- **Explicit opt-in seller storefronts** — private by default, seller-selected stable public IDs, bounded public name/bio, current Vault-supported active inventory only, and no leak of account IDs, email, permanent Vault IDs, purchase cost, storage or private collection information.

Seller storefronts do **not** claim identity verification, KYC completion, verified-purchase feedback, ratings, sales count, checkout, payment, buyer protection, settlement or ownership transfer. Seller reputation remains structurally unavailable until the Kingdom has authoritative completed-transaction and delivery evidence.

Research and trust rules: [`docs/research/2026-09-13-MARKETPLACE-WATCHLIST-SELLER-STOREFRONT.md`](docs/research/2026-09-13-MARKETPLACE-WATCHLIST-SELLER-STOREFRONT.md).

The Marketplace still intentionally does **not** claim live checkout, payment authorization/capture, escrow, settlement, payouts, KYC approval, tax handling, shipping labels/tracking, buyer protection, refunds/disputes, fraud/risk scoring, auctions, trades, or authoritative ownership transfer.

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
- [`docs/research/2026-09-13-MARKETPLACE-WATCHLIST-SELLER-STOREFRONT.md`](docs/research/2026-09-13-MARKETPLACE-WATCHLIST-SELLER-STOREFRONT.md) — current Marketplace engagement research and trust decisions.
- [`docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md`](docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md) — insurance/documentation research and report trust rules.
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

1. Re-run the complete Kingdom Quality Gate on the documented PR #36 head.
2. Merge PR #36 only if lint, type contracts, all tests, production build/artifact verifiers and the production dependency audit remain green.
3. Confirm `main` contains the saved-search/pagination baseline plus private watchlists and explicit seller storefront publication.
4. Begin fresh research for the **Safeguarded Transaction Foundation** before adding any Buy/Checkout/Pay control.
5. The transaction foundation must establish seller eligibility/KYC boundaries, an authoritative order state machine, idempotency, payment-provider/webhook authority, tax/shipment evidence, cancellation/refund/dispute handling, fraud controls, settlement, and the exact verified condition that may append provenance and transfer authoritative Vault ownership.
6. Keep checkout/payment/ownership-transfer controls unavailable until those authorities are real and tested end to end.

The governing Marketplace rule remains: **a click, watch, listing, saved search or storefront view is never a sale; ownership changes only after a separately verified transaction state authorizes it.**
