# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is a collector-first system for cataloging, locating, documenting, researching, protecting, grading-prep, valuing, and ultimately buying, selling, trading, insuring and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

**Current production baseline:** `ae5e47e05c8b7b986aeec0bff468734a4881db36` — reservation-aware Marketplace discovery and guarded Checkout UI merged through PR #43.  
**Latest verified Marketplace gate:** Kingdom Quality Gates #761 — **PASS** on exact head `fcc69f6cfd32933c8a2ce1e4a58c25af1e0d12e5`.  
**Verification:** 384/384 tests, production build + all Marketplace artifact verifiers, and production dependency audit with 0 vulnerabilities.  
**Royal Vault Phase 1:** production-capable baseline with Year/Tags, import/export, provenance, valuation, portfolio history and insurance-preparation reporting.

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
- A Marketplace listing, watch, saved search, storefront visit, share, Observatory snapshot, reservation attempt, Checkout-session creation or payment event is never by itself authoritative ownership transfer.
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

The production reporting slice provides private owner-scoped evidence packages without pretending the Kingdom is an insurer or professional appraiser. Archived treasures require explicit opt-in, unsupported value remains unavailable rather than becoming zero, and report generation performs no destructive mutation.

Research: [`docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md`](docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md).

## Kingdom Street Market — current production capability

Marketplace production supports real collector workflows across publication, discovery, market context and a safeguarded transaction backend:

- private Vault-linked fixed-price listing drafts;
- explicit possession, right-to-sell and accuracy attestations before publication;
- quantity validation against current Vault possession;
- immutable published representation SHA-256 hashes;
- fail-closed suppression if a Vault treasure is archived or quantity no longer supports the offer;
- sanitized public listing payloads with no private Vault UUID, acquisition cost, private notes or storage data;
- accent-insensitive search, facets and currency-safe filtering/sorting with no automatic FX comparison;
- bounded query-bound keyset pagination;
- private saved searches that rerun current market state rather than storing stale snapshots;
- private watchlists with no reservation or purchase semantics;
- optional seller storefronts that remain private until explicit publication;
- shareable evidence-rich listing-detail pages using Marketplace listing IDs rather than private Vault treasure IDs;
- active-only detail behavior: withdrawn, archived, unsupported or integrity-failed offers are not replayed from stale snapshots;
- Great Hall / Keeper Marketplace availability context;
- Active Market Observatory asking-price intelligence with strict sold-vs-asking and currency separation;
- provider-hosted Stripe Connect seller onboarding backend when configured;
- provider-neutral seller payment-account persistence;
- buyer-private order persistence/read APIs;
- atomic Vault-backed quantity reservation and idempotent Checkout creation;
- signed raw-body provider webhook verification and provider-event deduplication;
- provider-authoritative payment-state evidence;
- crash-safe stale-reservation recovery;
- public sanitized checkout-availability reads that never expose buyer/order identities;
- reservation-aware Street Market/storefront cards that separate published quantity from current sellable quantity;
- conditional secure Checkout controls only when live quantity, seller payment readiness and deployment transaction gates all pass;
- bounded/lazy availability hydration with truthful unconfirmed states when current availability cannot be verified;
- responsive Street Market, storefront, listing-detail and Observatory surfaces.

Marketplace recovery and production ledger: [`docs/MARKETPLACE-PROGRESS.md`](docs/MARKETPLACE-PROGRESS.md).

### Active Market Observatory — production

The Active Market Observatory is a read-only public market-context surface backed by the same live, integrity-checked pagination used by Marketplace discovery. It reports currently supported offer/category counts, separate per-currency asking-price groups, lowest/middle/high asks, 24-hour/7-day publication activity and category-level asking ranges.

The Observatory deliberately does **not** call asking prices market value. Completed sales are not included, currencies are never automatically combined, no FX conversion is performed, and a verified scan over the current 10,000-offer ceiling fails closed rather than publishing a partial sample as complete.

Research: [`docs/research/2026-09-14-MARKETPLACE-ACTIVE-MARKET-OBSERVATORY.md`](docs/research/2026-09-14-MARKETPLACE-ACTIVE-MARKET-OBSERVATORY.md).

### Safeguarded transaction foundation — production code, activation gated

PR #41 reconciled the real Stripe Connect transaction backend onto the Observatory production baseline instead of force-merging stale PR #38.

The production boundary includes hosted seller onboarding, provider-hosted Checkout, destination-charge routing, explicit tax/checkout gating, signed webhook authority, buyer-private order history, idempotent quantity reservation and reservation recovery. New `created` reservations receive a database deadline immediately; unattached reservations expire after 10 minutes, Stripe Checkout is policy-bounded to 30 minutes, and `checkout_pending` orders keep a 60-minute webhook-delivery grace window before safe release.

**Live buyer Checkout is OFF by default.** The default configuration sets:

```env
KINGDOM_MARKETPLACE_CHECKOUT_ENABLED=false
KINGDOM_STRIPE_TAX_ENABLED=false
KINGDOM_STRIPE_TAX_POLICY_ID=
```

The backend fails closed unless the required provider, signed-webhook, tax and reviewed policy configuration exists. Production code availability does not mean a deployment is configured for live payment acceptance.

The Kingdom still does **not** claim automatic Vault ownership transfer, automatic sold provenance, shipment/delivery verification, buyer-protection adjudication, verified-purchase ratings, independent KYC certification, or tax filing/remittance authority.

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
- [`docs/MARKETPLACE-PROGRESS.md`](docs/MARKETPLACE-PROGRESS.md) — Street Market production history, transaction truth and intentionally unavailable boundaries.
- [`docs/research/2026-09-14-MARKETPLACE-ACTIVE-MARKET-OBSERVATORY.md`](docs/research/2026-09-14-MARKETPLACE-ACTIVE-MARKET-OBSERVATORY.md) — active-market evidence model and Observatory truth rules.
- [`docs/research/2026-09-14-MARKETPLACE-SAFEGUARDED-TRANSACTIONS-PHASE1.md`](docs/research/2026-09-14-MARKETPLACE-SAFEGUARDED-TRANSACTIONS-PHASE1.md) — transaction provider, tax, webhook and reservation-recovery authority rules.
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

1. Reconcile the still-open fulfillment/transaction UX workstream with the PR #43 production baseline without weakening reservation, webhook, privacy or ownership safeguards.
2. Hide fully reserved inventory from normal discovery/storefront result sets and facets at the server authority while preserving direct listing evidence and deterministic pagination.
3. Complete private buyer order-state UI and provider-hosted seller payment-onboarding/status UI without collecting KYC documents inside the Kingdom.
4. Design and verify shipment/delivery, cancellation/refund/return, dispute and buyer-protection authority before any automatic sold provenance or Vault ownership transfer.
5. Admit completed-transaction Marketplace analytics only after authoritative completed-order evidence and settlement/completion policy exist; keep Observatory asking-price evidence separate.

The guiding Marketplace rule remains: **a click is never a sale; payment is not delivery, and ownership changes only after a separately verified transaction state authorizes it.**
