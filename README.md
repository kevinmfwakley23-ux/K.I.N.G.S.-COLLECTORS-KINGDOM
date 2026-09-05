# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging and locating treasures, preserving ownership/provenance records, receiving evidence-backed intelligence, and eventually buying, selling, trading, discovering, valuing, insuring, and protecting collectibles through the wider Kingdom.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified checkpoint:** the Royal Vault now includes permanent owner-scoped treasure records, hierarchical storage, secure private media, voice/talk-to-text, transactional JSON/CSV migration, a cross-device **Royal Intake Queue**, progressive camera barcode scanning, review-only ISBN/UPC/EAN/GTIN catalog candidates, an append-only **Provenance & Ownership Ledger**, cycle-safe individual and previewed atomic bulk reorganization, private Saved Vault Views with deterministic large-collection paging, category-specific exact-card evidence for **Pokémon TCG** and **Magic: The Gathering**, and the first provider-neutral **grading-certification database evidence via PSA**.

Latest verified implementation gate: **Kingdom Quality Gates #490** — run `33973285905` — **PASS** on commit `85cbb9a78211dd2b09259ef088f88f8a1d59748b`.

The PSA slice adds exact `psa-cert` certification-number verification through the official PSA Public API while keeping the access token server-side. Successful lookup is modeled as `certification-database-record` evidence: the Kingdom may confirm that PSA returned data associated with the cert number, but it explicitly keeps `physicalItemAuthenticated=false`. PSA itself warns that certification-number verification does not eliminate counterfeit risk and does not guarantee that a particular physical holder/item shown to a buyer is genuine.

PSA evidence is therefore deliberately different from treasure identity, catalog identity, grade authority, provenance, ownership, and valuation. A PSA Intake item can use **Verify PSA cert record** and review returned label/cert metadata against PSA's public certification page, but certification evidence cannot use the ordinary **Use in treasure editor** or **Review in treasure editor** handoff and cannot automatically write grade, condition, authenticity, ownership, provenance, value, or a treasure record.

The provider uses HTTPS outside local tests, a server-only bearer token, bounded timeout/response size, conservative serialized pacing, a provider-specific 15-minute cache, and explicit no-data/invalid-request/token/rate-limit/upstream/malformed/mismatch behavior. Provider estimate, sales, and price material is not normalized into Kingdom evidence.

Current sports-card provider research also found that SportsCardsPro/PriceCharting requires paid API access, documents a one-request-per-second API limit, and restricts use/redistribution of its proprietary price data in third-party-accessible software without express written permission. The Kingdom therefore does **not** silently depend on its pricing feed or represent it as a live valuation source.

Research records:

- `docs/research/2026-09-05-IMP-005-TRADING-CARD-CATALOG.md`
- `docs/research/2026-09-05-IMP-005-SCRYFALL-MTG-CATALOG.md`
- `docs/research/2026-09-05-IMP-005-SPORTS-CARD-CERT-EVIDENCE.md`

The next engineering target is **sports-card identity evidence + additional grading-provider verification research**. The next provider must have current official access/terms that permit the intended use. Price licensing, card identity, grading-cert database evidence, physical authentication, provenance, ownership, and valuation remain separate authorities.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent engineering mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — exact recoverable build state, verification evidence, limitations, and next target.
- [`docs/research/`](docs/research/) — dated construction-document, competitor, standards, provider/API, GitHub, and technical reconnaissance used before meaningful build work.

After every substantial verified implementation milestone, `docs/MISSION-PROGRESS.md` must be updated so development can resume from the repository rather than depending on a chat session.

## Permanent engineering rules

- The locked K.I.N.G.S. construction documents are the primary build guide; researched improvements may strengthen them but must not silently replace product intent.
- Research current competitors/open-source patterns and provider terms before each meaningful build pass.
- Build real, executable, production-oriented functionality; never present simulated integrations or decorative-only interfaces as complete features.
- Verify changes with the strongest available lint, contract, automated-test, production-build, artifact, dependency-audit, and query-plan gates relevant to the milestone.
- Never fabricate collection totals, market values, Marketplace activity, identification certainty, provenance verification, grading certainty, physical authenticity, or other domain data when no authoritative evidence exists.
- Never commit credentials, provider keys, access tokens, or secrets.
- Keep collector authority over destructive, ownership-changing, and authoritative record actions.
- AI and provider assistance must surface uncertainty rather than silently inventing identification, value, provenance, exact physical variant/finish, grade, or authenticity.
- Prefer portable data and provider-independent permanent Kingdom identities.
- Keep mobile, Chromebook, tablet, and desktop workflows first-class.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared intelligence/router core for the K.I.N.G.S. application family. Collector's Kingdom owns collector identity, authorization, Vault records, Marketplace rules, ownership state, and product actions. AI model/provider routing stays behind the governed server-to-server K.I.N.G.S. AI boundary, and provider credentials never belong in browser code.

The Keeper can advise through K.I.N.G.S. AI, but Kingdom record mutations remain explicitly authorized by Collector's Kingdom and the collector.

## Royal Vault — verified capability

The Vault establishes one permanent treasure identity that later Marketplace, provenance, grading, transfer, insurance, legacy, and valuation services can reuse rather than duplicating item records.

Current verified capability includes:

- owner-scoped treasure create/read/update/archive with permanent UUIDs;
- collection groups and arbitrary-depth physical storage;
- responsive collection/location editing with cycle protection;
- previewed atomic bulk movement of up to 100 permanent treasure UUIDs;
- private Saved Vault Views storing normalized query/filter/sort definitions only;
- deterministic keyset pagination with default 50 / maximum 100 records per page;
- secure private treasure media;
- structured condition/variant/quantity/acquisition/cost/identifier/custom-attribute fields;
- normalized search/filter/sort and duplicate candidate warnings;
- treasure/media/audit/provenance history;
- real statistics and currency-separated purchase totals;
- portable versioned JSON export;
- responsive Vault browser workspace;
- The Keeper acting as Royal Curator;
- voice navigation, Keeper questions, Vault search, safe treasure-entry commands, and talk-to-text where browser speech recognition is available.

### Transactional migration

JSON/CSV migration is review-first with persistent preview batches, mapping, validation/rejected/duplicate-review rows, explicit decisions, atomic all-or-nothing commit, stale-preview protection, and idempotent retry. Preview never silently writes treasures.

### Royal Intake Queue & scanner

Collectors can capture UPC, EAN, ISBN, Pokémon card IDs/set-card keys, Magic Scryfall printing IDs/set-collector keys, **PSA certification numbers**, catalog, serial, SKU, or custom identifiers into an account-scoped server-side queue. Repeated pending captures merge into a count and dismissed history is preserved.

PSA certification numbers are intentionally their own evidence identifier and are not aliased to an ordinary catalog or serial number for duplicate identity.

On secure browsers exposing native `BarcodeDetector`, the Vault offers explicit Start/Stop camera capture with supported-format discovery, rear-camera preference, debounce, authenticated Intake Queue writes, and camera-track shutdown. Manual intake remains the fallback.

### Review-only external evidence

The provider-neutral evidence boundary currently supports:

- **Open Library** — checksum-valid ISBN/book candidates;
- **UPCitemdb** — checksum-valid UPC/EAN/GTIN retail product candidates;
- **Pokémon TCG API** — exact provider card ID or explicit set-ID/card-number candidates;
- **Scryfall** — exact printing UUID or exact set-code/collector-number Magic candidates;
- **PSA Public API** — exact certification-number database evidence when a server-side PSA token is configured.

All evidence lookup paths are authenticated, review-only, bounded, and perform no automatic Vault write. Provider IDs and cert records remain supporting evidence rather than permanent Kingdom physical-item identity.

Commerce/price fields from identification providers and PSA estimate/sales data are deliberately excluded from normalized evidence and cannot become Kingdom market value, trade value, or purchase price through this path.

### Pokémon TCG intelligence

Verified through **Quality Gates #480** and later regression gates: exact provider-card-ID/set-card-number candidates, server-only provider access, bounded transport, identification-only normalized evidence, Royal Intake integration, responsive candidate review, unsaved editor prefill, and explicit exclusion of automatic physical variant/grade/value/provenance/ownership mutation.

### Magic: The Gathering / Scryfall intelligence

Verified through **Quality Gates #485** and later regression gates: exact printing UUID/set-collector lookup, printing-vs-Oracle identity separation, MTG print metadata and available finishes as review evidence, provider traffic safeguards, Royal Intake integration, and no automatic finish/condition/grade/authenticity/provenance/ownership/value mutation.

### PSA certification-database evidence

Verified through **Kingdom Quality Gates #490**:

- exact `psa-cert` identifier with 1–12 digit validation;
- official PSA Public API over HTTPS outside local tests;
- bearer token supplied only from server runtime configuration;
- token never included in public source URL or normalized evidence;
- public evidence link points to PSA's ordinary cert-verification page;
- bounded timeout and maximum response size;
- conservative serialized provider requests and 15-minute provider-specific cache;
- explicit 204/404 no-data, invalid request, rejected token, 429, upstream, malformed JSON/payload, oversized response, and cert-number mismatch behavior;
- bounded PSA and PSA/DNA label/cert metadata;
- provider price/estimate/sales material excluded;
- successful database match sets `certificationNumberVerifiedInDatabase=true` and `physicalItemAuthenticated=false`;
- PSA cert numbers remain separate from ordinary catalog/serial identity;
- responsive verification-only UI;
- no automatic treasure-editor handoff, grade transfer, condition, authenticity, provenance, ownership, value, or Vault mutation;
- runtime capability is honest when the server-side PSA token is absent.

### Provenance & Ownership Ledger

Saved treasures expose an append-only provenance timeline. Acquisition, ownership/provenance notes, supporting documents, custody/loan, sale/gift/trade, loss/stolen/recovery, and corrections are owner-scoped and audited. Collector-entered statements remain labeled as collector-recorded unless separately verified.

### Saved Vault Views + large-collection retrieval

Verified through Quality Gates #464, #474, and #475 with current-data saved queries, deterministic keyset pages, query-bound cursors, UUID tie-breaking, responsive saved-view controls, a Load more flow, and `EXPLAIN QUERY PLAN` regression proof for intended paging indexes.

## Truthfulness boundary

Market values remain absent until a real evidence-backed, legally usable valuation service is implemented. A barcode, image, title match, provider result, AI suggestion, ISBN, catalog ID, receipt, certificate number, grading label, Oracle ID, provider finish list, or collector-entered provenance statement is not automatically authoritative. A valid grading-company certification-number database record confirms provider data for that certification number; it does not by itself authenticate the physical collectible being presented. Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.

## Current next target

**IMP-005 — Sports-card identity evidence + additional grading-provider verification research.**

The next pass must verify current official APIs/access and data-use terms before integration. SportsCardsPro remains a possible future permission-aware catalog source, but its proprietary pricing cannot be redistributed through the Kingdom without the required rights. Additional graders such as BGS, SGC, CGC or others may only be added through current official verification/API mechanisms with the same database-evidence-versus-physical-authentication separation. Image recognition, evidence-backed valuation, destructive bulk actions, insurance/reporting expansion, and Marketplace ownership transfer remain separate later milestones.
