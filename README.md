# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is a collector-first system for cataloging, locating, documenting, researching, protecting, grading-prep, valuing, and eventually buying, selling, trading, insuring and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified production slice:** **PR #30 — Persistent Evidence-Cited Collection Value History**  
**Canonical validation:** repository `npm run verify` + production dependency audit — **PASS** on the implementation branch before integration

PR #30 adds the next trust-first portfolio layer: owner-scoped immutable valuation snapshots, SHA-256 snapshot integrity, exact sold-evidence IDs, separate currency history, collection/time-range queries, cause-aware deltas, realized-sale provenance citations, an accessible historical Vault view, and Keeper explanations that distinguish evidence movement from collector-driven collection changes.

## Permanent truth boundary

The Kingdom never silently upgrades evidence into authoritative truth.

- A provider match does not become permanent physical-item identity.
- An AI pre-grade is not an official PSA/BGS/CGC/SGC grade.
- Autograph image similarity is not professional authentication.
- Collector-entered provenance is not independently verified unless a separate authority verifies it.
- A sold comparable or asking listing is not automatically authoritative market value.
- A provider observation remains evidence, not an automatic appraisal.
- A collector's own realized sale is historical lifecycle evidence, not automatically a current market comparable.
- A Kingdom valuation or portfolio estimate is advisory evidence, not an appraisal or guaranteed sale price.
- A portfolio history point is a record of what the evidence supported at that time, not proof of a future or guaranteed market outcome.
- No grading, valuation, catalog, AI, provenance or marketplace subsystem may silently overwrite authoritative ownership or permanent physical treasure identity.

Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.

## Royal Vault — production capability

The current verified system includes:

- owner-scoped permanent treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collections and arbitrary-depth physical storage locations;
- collection/location editing with cycle protection;
- previewed atomic bulk movement of up to 100 treasures;
- private Saved Vault Views storing query/filter/sort definitions rather than frozen results;
- deterministic keyset pagination with verified SQLite indexes;
- secure private treasure media with SHA-256 integrity metadata;
- structured condition, variant, quantity, acquisition, cost, identifiers and custom attributes;
- duplicate-review warnings and normalized search/filter/sort;
- transactional review-first JSON/CSV import;
- Royal Intake Queue with repeated-capture counts and preserved dismissed history;
- progressive native camera barcode capture where `BarcodeDetector` exists;
- portable versioned JSON export;
- voice navigation, Keeper questions, Vault search and talk-to-text where browser speech recognition exists;
- append-only provenance/ownership history;
- append-only grading evidence and finding-review history;
- calibrated physical-measurement evidence;
- macro corner/edge evidence refinement;
- append-only market-comparable evidence and transparent advisory valuation;
- derived realized-sale/value-history linkage with exact source-record references;
- production-wired advanced Vault UI modules;
- evidence-backed collection portfolio coverage and separate per-currency rollups;
- provider-originated valuation observations with explicit provider/policy/retrieval identity;
- exact evidence-cited Keeper valuation explanations;
- immutable portfolio valuation snapshots with SHA-256 integrity checks;
- persistent per-currency collection value history with exact evidence IDs;
- collection-scoped and bounded time-range portfolio history queries;
- cause-aware portfolio change summaries;
- Keeper portfolio-history explanations with snapshot, valuation-evidence and realized-sale provenance citations;
- accessible 30-day, 90-day, one-year and all-history Vault charts with explicit evidence gaps rather than manufactured zeroes.

## Provider-neutral valuation observations — integrated in PR #28

### Normalized observation contract

Every provider-originated observation must carry:

- provider ID;
- provider observation/source-record ID;
- explicit provider policy/terms identifier;
- observation type;
- source name plus auditable URL/reference;
- observed date;
- retrieval timestamp;
- integer amount in minor currency units;
- explicit three-letter currency;
- item state;
- condition context when required;
- grading company + grade label for graded observations.

Provider evidence is stored as `provider-originated-observation`, separate from `collector-recorded-comparable` evidence.

### First official network adapter: eBay Browse

The eBay integration uses the official Buy/Browse API with application OAuth. It is intentionally conservative:

- active Browse results are **asking listings only**;
- eBay item IDs remain provider observation IDs;
- provider policy identity and retrieval time are preserved;
- incomplete provider rows are rejected;
- OAuth/API failures and timeouts fail closed;
- valid application tokens are cached;
- active asking listings never become sold comparables;
- active asking listings never influence the Kingdom sold-comparable median estimate.

The adapter is enabled only when all three exist together:

```env
KINGDOM_EBAY_CLIENT_ID=...
KINGDOM_EBAY_CLIENT_SECRET=...
KINGDOM_EBAY_PROVIDER_POLICY_ID=...
```

Optional settings:

```env
KINGDOM_EBAY_API_BASE_URL=https://api.ebay.com
KINGDOM_EBAY_MARKETPLACE_ID=EBAY_US
KINGDOM_EBAY_TIMEOUT_MS=5000
```

The explicit policy ID is the deployment's own record of which provider terms/policy revision was reviewed and approved. Credentials without it do not enable the adapter.

No scraping workaround is used for restricted/unavailable sold-history access.

## Evidence-backed valuation rules

The Kingdom deliberately improves on the common collector-app pattern of showing one unexplained price.

Current behavior includes:

- owner-scoped append-only valuation evidence tied to permanent treasure UUIDs;
- separate `sold-comparable` and `asking-listing` evidence types;
- source name plus source URL/reference;
- observed date, integer amount, currency, raw/graded/sealed state, condition and grading context;
- SHA-256 evidence integrity verification;
- provider identity/policy/retrieval metadata included in provider evidence integrity;
- linked append-only collector corrections instead of destructive edit/delete history;
- provider-observation deduplication;
- provider-originated observations protected from collector rewrite/correction;
- strict currency and condition/grade buckets;
- a 180-day freshness window for current sold evidence;
- a minimum of three compatible recent sold comparables before an estimate is calculated;
- median-based advisory estimate with visible low/high range, sample count, named-source count and confidence label;
- asking listings displayed as context but excluded from the estimate;
- realized owner sales retained as lifecycle history but excluded from the current market-comparable estimate;
- no automatic FX conversion;
- no mutation of authoritative treasure value, grade, condition, authenticity, provenance or ownership.

## Evidence-cited Keeper explanations

The Keeper no longer has to repeat an opaque value. The valuation explanation path exposes:

- exact valuation evidence UUIDs used by the selected estimate;
- source record/reference IDs when the stored evidence actually contains them;
- source URLs;
- provider ID + provider policy ID for provider-originated observations;
- exact realized-sale provenance event IDs from the immutable value-history read model;
- realized-sale correction IDs/history;
- explicit statements that asking listings and realized owner sales do not influence the current sold-comparable estimate;
- explicit non-appraisal/non-guaranteed-price/no-cross-currency language.

The Keeper does not invent missing source record IDs.

## Realized-sale value history

The value-history read model remains derived rather than a mutable mystery-value field.

It keeps:

- valuation observations linked to exact valuation evidence IDs;
- collector-recorded `sold` provenance events linked to exact provenance event IDs;
- priced and unpriced realized sales distinguishable;
- corrections append-only and auditable;
- realized owner sales out of the current comparable-price estimate;
- currencies separate;
- cross-currency aggregation disabled.

## Persistent collection portfolio history — PR #30

The production Vault now persists what the evidence actually supported over time rather than recomputing a historical chart from today's state.

### Snapshot authority

Each owner-scoped snapshot stores:

- generation time and previous-snapshot linkage;
- active/valued treasure counts and evidence coverage;
- exclusion counts and reasons;
- quantity-aware treasure contributions;
- exact supporting sold-evidence IDs;
- separate currency totals and category/collection rollups;
- the valuation policy in force for the derived read model;
- an SHA-256 integrity digest over the stored snapshot document.

Snapshots are append-only through the portfolio-history boundary. A later valuation correction produces a later calculation without rewriting the older historical point.

An unchanged capture on the same UTC day reuses the existing snapshot so opening or focusing the Vault does not flood history. A changed portfolio state is captured immediately, and an unchanged later day may become the next historical point.

### Historical query and change semantics

The history API supports bounded time ranges, optional collection scope and optional currency scope. It returns the latest bounded window in chronological order for responsive charting.

History never creates a cross-currency grand total. When evidence support is absent, the point is unavailable rather than zero.

Snapshot comparisons distinguish:

- valuation support gained;
- valuation support lost;
- treasure no longer active;
- quantity changed;
- collection membership changed;
- valuation correction;
- supporting evidence changed.

This means a collector can see whether a portfolio delta came from the evidence set or from a change they made to the collection rather than having every movement mislabeled as a market gain or loss.

### Keeper portfolio-history intelligence

The Keeper history explanation cites:

- comparison snapshot IDs, timestamps and SHA-256 hashes;
- changed treasure IDs;
- exact valuation evidence IDs;
- realized-sale provenance record IDs where available;
- separate currency deltas and evidence-coverage changes;
- explicit language that realized sales remain lifecycle context and do not influence the sold-comparable estimate;
- explicit no-appraisal/no-prediction/no-FX language.

### Vault history UX

The live Vault portfolio panel now uses the persisted server snapshot as its current authority rather than independently rebuilding the total in the browser. It provides:

- 30-day, 90-day, one-year and all-history controls;
- a separate chart per currency;
- line gaps when a historical point lacked enough compatible evidence;
- screen-reader chart descriptions;
- keyboard-operable time ranges;
- textual recent-point audit history;
- exact evidence ID previews;
- an explicit “Ask the Keeper why it changed” evidence explanation action;
- reduced-motion support.

## AI card pre-grading

The Kingdom contains an advisory card-condition analysis system rather than a fake official-grade generator.

Current capability includes standard-western and Japanese-size card profiles, centering measurement, capture-quality checks, card geometry/crop/perspective analysis, contour/macro corner-edge signals, paired raking-light surface comparison, same-printing color/fade comparison, authenticated Commons autograph reference discovery, append-only SHA-linked pre-grade records, detector-completion evidence, fail-closed server-generated advisory range, calibrated physical measurement and explicit no-mutation flags for official grade/condition/authenticity/value.

## Review-only external evidence

Provider-neutral identification/certification evidence currently supports:

- **Open Library** — ISBN/book candidates;
- **UPCitemdb** — UPC/EAN/GTIN retail candidates;
- **Pokémon TCG API** — exact card or set/card-number candidates;
- **Scryfall** — exact Magic printing UUID or set/collector-number candidates;
- **The Card API** — eligible exact sports-card catalog evidence;
- **PSA Public API** — exact certification-number database evidence when configured;
- **Wikimedia Commons / MediaWiki API** — autograph reference-image candidates with source/license metadata.

These provider IDs remain supporting evidence rather than permanent Kingdom physical identity. Identification-provider prices do not silently become valuation evidence.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared intelligence/router core for the K.I.N.G.S. application family. Collector's Kingdom owns collector identity, authorization, Vault records, Marketplace rules, ownership state and product actions. Model/provider routing stays behind the governed server-to-server K.I.N.G.S. AI boundary.

The Keeper may advise through K.I.N.G.S. AI, but Collector's Kingdom and the collector remain the authority for record mutation.

## Official brand & install surface

The product-owner supplied Collector's Kingdom crest is the canonical brand asset. It is wired into the landing page, Royal Gate, Great Hall, Royal Vault, castle rooms, Marketplace route and install metadata through the shared browser bootstrap.

The current install surface is a real PWA. Its service worker is static-only and excludes `/api/` traffic and document navigations so authenticated records/evidence are not silently cached.

This is **not** a claim that a signed native Android APK is already complete. Native packaging/signing/device verification remain separate milestones.

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

Build production artifact:

```bash
npm run build
npm run start:prod
```

The production build manifest identifies `apps/web/runtime.mjs` as the real wired entrypoint.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — recoverable build state, verified checkpoints, blockers and exact next target.
- [`docs/research/2026-09-13-IMP-005-COLLECTION-VALUE-HISTORY.md`](docs/research/2026-09-13-IMP-005-COLLECTION-VALUE-HISTORY.md) — current collection-history competitor research and Kingdom evidence/cause design decisions.
- [`docs/research/2026-09-12-IMP-005-PROVIDER-OBSERVATIONS-KEEPER-EVIDENCE.md`](docs/research/2026-09-12-IMP-005-PROVIDER-OBSERVATIONS-KEEPER-EVIDENCE.md) — provider/competitor research and trust decisions for licensed observations.
- [`docs/research/`](docs/research/) — dated competitor, provider, standards and technical research.

Documentation is part of implementation. After substantial verified build batches, update README and mission/progress before moving on.

## Permanent engineering rules

- The locked K.I.N.G.S. construction documents remain the primary product guide.
- Research current competitors, open-source patterns, official APIs and provider terms before meaningful integration work.
- Build executable functionality; never present simulated integrations, mock totals, fake market data or decorative-only interfaces as complete.
- Never commit secrets or expose provider credentials in browser code.
- Preserve collector authority over destructive, ownership-changing, grading, authentication and authoritative record actions.
- External evidence must surface uncertainty instead of silently inventing identity, variant, condition, grade, authenticity, provenance or value.
- Mobile, Android, Chromebook, tablet and desktop workflows are first-class.

## Current next engineering target

**IMP-005 Royal Vault Completion Audit + Collector-Owned Reporting / Insurance Preparation Foundation**

Next build order:

1. map every locked IMP-005 Royal Vault deliverable and definition-of-done item to the current production implementation and automated/manual verification evidence;
2. identify any remaining real Vault gap before declaring Royal Vault Phase 1 complete rather than adding redundant code;
3. research current collector inventory/insurance-report workflows and data requirements from reputable insurance/documentation providers;
4. build an owner-controlled export/report boundary that can package treasure identity, quantity, condition context, purchase data, media references, provenance references and evidence-backed valuation snapshot data without calling the result an appraisal;
5. keep estimated value visibly separate from confirmed acquisition/disposition financial records;
6. preserve exact snapshot/evidence/provenance identifiers in exported valuation history where included;
7. keep automatic FX conversion disabled until a separately governed FX policy exists;
8. maintain accessible print/mobile behavior and collector data portability;
9. pass full Kingdom Quality Gates and update README/`docs/MISSION-PROGRESS.md` at the verified checkpoint.

After the IMP-005 completion audit closes Royal Vault Phase 1, continue the locked construction sequence rather than keeping the Vault milestone open indefinitely.

Later milestones include additional licensed sold-comparable providers, broader image identification, alternate-light/UV/spectral analysis, additional official grader integrations, full Treasury analytics/reporting, native Android APK packaging, Marketplace ownership transfer/settlement and destructive bulk archive/delete flows.
