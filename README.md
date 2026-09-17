# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is a collector-first system for cataloging, locating, documenting, researching, protecting, grading-prep, valuing, and ultimately buying, selling, trading, insuring and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

**Current production baseline:** `b503b28b979e7be4768d11a88fb49ba67ab2f494` on `main` — the Marketplace Active Market Observatory production code from PR #39 plus its documentation lock.  
**Latest production Marketplace gate:** Kingdom Quality Gates #742 — **PASS**, including production dependency audit.  
**Royal Vault Phase 1:** production-capable baseline with Year/Tags, import/export, provenance, valuation, portfolio history and insurance-preparation reporting.  
**Safeguarded transaction candidate:** PR #38 — `Marketplace: safeguarded transactions phase 1` — reconciled onto current `main`, runtime/HTTP/UI wired, and implementation checkpoint `61c6bbacc94bc6da826ef355113b29154f81069e` passed Kingdom Quality Gates #750 including the production dependency audit. It remains a PR branch and is **not a production checkout claim until reviewed and merged**.

The repository contains real executable Node.js/SQLite application code, tests and production artifact verification. Documentation, UI, provider adapters and architecture claims are not considered complete merely because a file exists: production status requires executable integration and the canonical quality gate.

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
- A Marketplace listing, watch, saved search, storefront visit, share, Observatory snapshot, reservation attempt or checkout-session creation is never by itself a completed sale.
- A browser redirect from a payment provider is not payment authority; verified provider webhook state is the transaction evidence authority for this phase.
- No grading, valuation, catalog, AI, provenance or Marketplace subsystem may silently overwrite ownership or permanent physical treasure identity.

Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.

## Royal Vault — verified production capability

The Royal Vault includes:

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
- owner-controlled collection evidence / insurance-preparation reports in JSON and print-friendly HTML.

### Collector-owned insurance preparation reporting

The production reporting slice provides private owner-scoped evidence packages without pretending the Kingdom is an insurer or professional appraiser.

It includes permanent treasure identity, Year/Tags, quantity, condition, collection/storage context, acquisition facts, private media references with SHA-256 metadata, provenance IDs, evidence-backed advisory valuation references, portfolio snapshot citation, per-currency totals, deterministic report integrity hashing, explicit non-appraisal language and browser Print / Save as PDF support.

Archived treasures require explicit opt-in, unsupported value remains unavailable rather than becoming zero, and report generation performs no destructive mutation.

Research: [`docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md`](docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md).

## Kingdom Street Market — current production capability

Marketplace production currently supports real pre-transaction collector workflows:

- private Vault-linked fixed-price listing drafts;
- explicit possession, right-to-sell and accuracy attestations before publication;
- quantity validation against current Vault possession;
- immutable published representation SHA-256 hashes;
- fail-closed suppression if a Vault treasure is archived or quantity no longer supports the offer;
- sanitized public listing payloads with no private Vault UUID, acquisition cost, private notes or storage data;
- accent-insensitive multi-field search;
- category, currency and fulfillment facets;
- currency-safe price filtering/sorting with no automatic FX comparison;
- bounded query-bound keyset pagination;
- private saved searches that rerun current market state rather than storing stale result snapshots;
- private watchlists with no reservation or purchase semantics;
- optional seller storefronts that remain private until explicit publication;
- seller-selected immutable public storefront IDs and current live supported inventory;
- shareable evidence-rich listing-detail pages using Marketplace listing IDs rather than private Vault treasure IDs;
- copy/share and private watch actions from listing detail;
- active-only detail behavior: withdrawn, archived, unsupported or integrity-failed offers are not replayed from stale snapshots;
- Great Hall / Keeper Marketplace availability context;
- responsive Street Market, storefront, listing-detail and Observatory surfaces.

Marketplace recovery and production ledger: [`docs/MARKETPLACE-PROGRESS.md`](docs/MARKETPLACE-PROGRESS.md).

### Active Market Observatory — production

The Active Market Observatory is a read-only public market-context surface backed by the same live, integrity-checked pagination used by Marketplace discovery.

It reports:

- total currently supported active offers;
- active offer counts by category;
- separate per-currency asking-price groups;
- lowest ask, exact middle-rank ask/range and highest ask;
- 24-hour and 7-day listing-publication activity;
- category-level asking ranges inside each currency.

The Observatory deliberately does **not** call asking prices market value. Completed sales are not included, currencies are never automatically combined, no FX conversion is performed, and a verified scan over the current 10,000-offer ceiling fails closed rather than publishing a partial sample as complete. Representation-integrity failure or invalid publication evidence blocks the whole snapshot.

Research: [`docs/research/2026-09-14-MARKETPLACE-ACTIVE-MARKET-OBSERVATORY.md`](docs/research/2026-09-14-MARKETPLACE-ACTIVE-MARKET-OBSERVATORY.md).

## Safeguarded transaction candidate — verified PR branch, not production yet

PR #38 now contains executable safeguarded transaction integration rather than an architecture-only draft. It was reconciled onto the current `main` production tree without replacing the Observatory baseline, and checkpoint `61c6bbacc94bc6da826ef355113b29154f81069e` passed Kingdom Quality Gates #750, including lint, type contracts, the complete test suite, build verification, Marketplace verifiers and the production dependency audit.

The branch now includes:

- Stripe Connect hosted seller onboarding with provider-neutral persisted seller payment-account state;
- authenticated seller payment readiness/status and hosted onboarding HTTP routes;
- idempotent Vault-backed order reservation with oversell protection;
- provider-hosted checkout-session creation only after current listing, seller, quantity, payment-provider and tax gates pass;
- explicit deployment gates for checkout, Stripe automatic tax and a reviewed tax-policy identifier;
- raw-body Stripe webhook signature verification and provider-event deduplication;
- webhook-authoritative payment-state transitions with append-only order history;
- expiry/cancellation reservation release, partial-refund evidence and late-event conflict protection;
- authenticated buyer order-history HTTP routes;
- a listing-detail checkout surface that remains disabled when production capability gates are not satisfied;
- an Orders & Payments center for buyer order evidence and seller payment onboarding/readiness;
- idempotency keys generated client-side and enforced server-side;
- HTTPS-only external provider redirects, with loopback HTTP allowed only for local development;
- explicit `ownershipTransferAuthorized: false` and `soldProvenanceEventCreated: false` behavior throughout this phase.

This branch still does **not** mean live production payments are enabled. Deployment must supply the real payment-provider secrets and webhook secret, explicitly enable checkout and automatic tax, provide the reviewed tax-policy identifier, and complete seller provider onboarding. Until all gates are satisfied, checkout fails closed.

Production `main` still does not claim complete shipping protection/tracking, buyer protection, fraud/risk scoring, verified-purchase ratings, offers/counteroffers, auctions, trades, automatic sold provenance or authoritative Marketplace-driven Vault ownership transfer. Refund/dispute provider events are evidence/state inputs in the transaction foundation; full customer-facing refund, return, dispute and buyer-protection workflows remain later milestones.

Research: [`docs/research/2026-09-14-MARKETPLACE-SAFEGUARDED-TRANSACTIONS-PHASE1.md`](docs/research/2026-09-14-MARKETPLACE-SAFEGUARDED-TRANSACTIONS-PHASE1.md).

## Evidence-backed valuation rules

Current Vault valuation behavior is deliberately conservative:

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

Enable only when all reviewed deployment values exist:

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

The product-owner supplied Collector's Kingdom crest is the canonical brand asset and is wired into the landing page, Royal Gate, Great Hall, Royal Vault, castle rooms, Marketplace surfaces and install metadata.

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

Run the complete production-quality gate:

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
- [`docs/MARKETPLACE-PROGRESS.md`](docs/MARKETPLACE-PROGRESS.md) — Street Market production history, current transaction candidate and intentionally unavailable boundaries.
- [`docs/research/2026-09-14-MARKETPLACE-ACTIVE-MARKET-OBSERVATORY.md`](docs/research/2026-09-14-MARKETPLACE-ACTIVE-MARKET-OBSERVATORY.md) — active-market evidence model and Observatory truth rules.
- [`docs/research/2026-09-14-MARKETPLACE-SAFEGUARDED-TRANSACTIONS-PHASE1.md`](docs/research/2026-09-14-MARKETPLACE-SAFEGUARDED-TRANSACTIONS-PHASE1.md) — payment-provider, tax, order-state and ownership truth boundaries.
- [`docs/research/2026-09-13-MARKETPLACE-LISTING-DETAIL.md`](docs/research/2026-09-13-MARKETPLACE-LISTING-DETAIL.md) — shareable listing-detail research and privacy rules.
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

1. Keep PR #38 green after this recovery-ledger closeout and require a fresh exact-head quality gate before integration.
2. Review the reconciled transaction diff against current `main`; merge only after the exact-head gate remains green.
3. In deployment, configure real Stripe Connect/webhook secrets, explicitly enable checkout and automatic tax, set the reviewed tax-policy identifier, and verify provider-hosted seller onboarding before calling checkout live.
4. Build the next guarded order-lifecycle slice around shipping evidence/tracking, customer-facing cancellation/refund/return/dispute handling, buyer protection and fraud/risk boundaries.
5. Define and separately verify the exact completed-transaction condition before any automatic sold-provenance append or authoritative Royal Vault ownership transfer is introduced.
6. Add transaction-backed Marketplace analytics only after verified completed-order evidence exists; keep Observatory asking-price evidence separate.

The guiding Marketplace rule remains: **a click is never a sale; ownership changes only after a separately verified transaction state authorizes it.**
