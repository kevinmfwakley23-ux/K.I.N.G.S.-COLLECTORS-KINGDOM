# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging and locating treasures, preserving ownership/provenance records, receiving evidence-backed intelligence, and eventually buying, selling, trading, discovering, valuing, insuring, and protecting collectibles through the wider Kingdom.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified checkpoint:** the Royal Vault now includes permanent owner-scoped treasure records, hierarchical storage, secure private media, voice/talk-to-text, transactional JSON/CSV migration, a cross-device **Royal Intake Queue**, progressive camera barcode scanning, review-only ISBN and UPC/EAN/GTIN catalog candidates, an append-only **Provenance & Ownership Ledger**, cycle-safe individual collection/location stewardship, previewed atomic bulk treasure reorganization, private Saved Vault Views with deterministic large-collection paging, and category-specific exact-card evidence for **Pokémon TCG and Magic: The Gathering**.

Latest verified implementation gate: **Kingdom Quality Gates #485** — run `33971901302` — **PASS** on commit `1301f2d4b49530f87ea99124ed202d2b9dcb2efc`.

The Magic slice adds Scryfall behind the existing provider-neutral review-only catalog service. It supports exact `mtg-scryfall-id` printing UUIDs and exact `mtg-set-number` set-code/collector-number keys. External access is HTTPS-only, uses a meaningful `User-Agent` and JSON `Accept` header, defaults to a conservative 150 ms serialized interval, does not retry aggressively through 429 responses, and enforces timeout, response-size, JSON-shape, and identifier-match protections.

Scryfall candidates preserve printing ID and Oracle ID as **different evidence concepts**. Set, collector number, language, rarity, release date, artist, layout/frame, bounded card-face metadata, and provider-declared available finishes may be reviewed. Prices, purchase/store links, commerce material, and images are deliberately excluded from normalized catalog evidence. A listed finish is not treated as proof of the collector's physical finish.

The Royal Intake Queue now accepts exact Pokémon and Magic identifiers. A supported pending item can request a provider candidate and copy selected evidence into a **new unsaved treasure editor**. No provider path automatically sets physical variant/finish, condition, grade, provenance, ownership, purchase price, market value, or Marketplace state, and no catalog lookup automatically writes a Vault treasure.

Research records:

- `docs/research/2026-09-05-IMP-005-TRADING-CARD-CATALOG.md`
- `docs/research/2026-09-05-IMP-005-SCRYFALL-MTG-CATALOG.md`

The next engineering target is **sports-card catalog evidence + grading-cert verification boundaries**. Current reconnaissance shows SportsCardsPro/PriceCharting exposes paid sports-card catalog APIs with strict one-request-per-second limits, while PSA exposes authenticated certification-number verification. Those are different evidence classes: catalog identity/parallel evidence must remain separate from grading-cert evidence, and a matching PSA certification record must never be represented as proof that the physical slab in front of the collector is genuine.

Image recognition, automatic parallel/finish authentication, evidence-backed market valuation, destructive bulk actions, and Marketplace ownership transfer remain separate future milestones and are not represented as live.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent engineering mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — exact recoverable build state, verification evidence, limitations, and next target.
- [`docs/research/`](docs/research/) — dated construction-document, competitor, standards, provider/API, GitHub, and technical reconnaissance used before meaningful build work.

After every substantial verified implementation milestone, `docs/MISSION-PROGRESS.md` must be updated so development can resume from the repository rather than depending on a chat session.

## Permanent engineering rules

- The locked K.I.N.G.S. construction documents are the primary build guide; researched improvements may strengthen them but must not silently replace product intent.
- Research current competitors/open-source patterns before each meaningful build pass.
- Build real, executable, production-oriented functionality; never present simulated integrations or decorative-only interfaces as complete features.
- Verify changes with the strongest available lint, contract, automated-test, production-build, artifact, dependency-audit, and query-plan gates relevant to the milestone.
- Never fabricate collection totals, market values, Marketplace activity, notifications, identification certainty, provenance verification, grading certainty, or other domain data when no authoritative evidence exists.
- Never commit credentials, provider keys, access tokens, or secrets.
- Keep collector authority over destructive, ownership-changing, and authoritative record actions.
- AI and provider assistance must surface uncertainty rather than silently inventing an identification, value, provenance claim, exact physical variant/finish, grade, or authenticity claim.
- Prefer portable data and provider-independent permanent Kingdom identities.
- Keep mobile, Chromebook, tablet, and desktop workflows first-class.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared intelligence/router core for the K.I.N.G.S. application family. Collector's Kingdom owns collector identity, authorization, Vault records, Marketplace rules, ownership state, and product actions. AI model/provider routing stays behind the governed server-to-server K.I.N.G.S. AI boundary, and provider credentials never belong in browser code.

The Keeper can advise through K.I.N.G.S. AI, but Kingdom record mutations remain explicitly authorized by Collector's Kingdom and the collector.

## Royal Vault — verified capability

The Vault establishes one permanent treasure identity that later Marketplace, provenance, grading, transfer, insurance, legacy, and valuation services can reuse rather than duplicating item records.

Current verified capability includes:

- owner-scoped treasure create/read/update/archive;
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

Collectors can capture UPC, EAN, ISBN, Pokémon card IDs/set-card keys, Magic Scryfall printing IDs/set-collector keys, catalog, serial, SKU, or custom identifiers into an account-scoped server-side queue. Repeated pending captures merge into a count and dismissed history is preserved.

On secure browsers exposing native `BarcodeDetector`, the Vault offers explicit Start/Stop camera capture with supported-format discovery, rear-camera preference, debounce, authenticated Intake Queue writes, and camera-track shutdown. Manual intake remains the fallback.

### Review-only external catalog evidence

The provider-neutral catalog boundary currently supports:

- **Open Library** — checksum-valid ISBN/book candidates;
- **UPCitemdb** — checksum-valid UPC/EAN/GTIN retail product candidates;
- **Pokémon TCG API** — exact provider card ID or explicit set-ID/card-number candidates;
- **Scryfall** — exact printing UUID or exact set-code/collector-number Magic candidates.

All catalog lookup paths are authenticated, review-only, cache/rate/timeout bounded, and perform no automatic Vault write. Provider IDs remain supporting evidence rather than permanent Kingdom identity.

Commerce/price fields from identification providers are deliberately excluded from normalized candidate evidence and cannot become Kingdom market value, trade value, or purchase price through the catalog path.

### Pokémon trading-card catalog intelligence

Verified through **Kingdom Quality Gates #480** and the later regression gates:

- exact `pokemon-card-id` and `pokemon-set-number` modes;
- optional server-only API key;
- bounded HTTPS transport and conservative pacing;
- honest 404/429/upstream/malformed-payload behavior;
- identification-only normalized evidence;
- Royal Intake capture, duplicate-review warnings, candidate review, and unsaved editor prefill;
- no automatic physical variant, condition, grade, provenance, value, purchase price, ownership change, or Vault save.

### Magic: The Gathering / Scryfall intelligence

Verified through **Kingdom Quality Gates #485**:

- exact `mtg-scryfall-id` printing UUID and `mtg-set-number` set/collector modes;
- meaningful User-Agent + explicit JSON Accept header;
- HTTPS outside local tests;
- default 150 ms serialized request spacing, beneath Scryfall's published request ceiling;
- no aggressive retry loop through rate limits;
- timeout, response-size, 404, 429, 5xx, malformed JSON/payload, and exact-identifier mismatch protections;
- printing ID and Oracle ID preserved separately;
- language, set, collector number, rarity, artist, release date, layout/frame, card-face summary, promo/digital/reprint/variation flags, and available finishes retained as bounded review evidence;
- prices, purchase/store links, commerce data, and image URIs excluded from normalized candidates;
- Royal Intake capture and duplicate-review semantics;
- responsive `Find Magic printing candidate` workflow;
- copy-to-editor creates a new **unsaved** draft only;
- no automatic finish/variant, condition, grade, authenticity, provenance, ownership, value, purchase price, or Vault mutation.

### Provenance & Ownership Ledger

Saved treasures expose an append-only provenance timeline. Acquisition, ownership/provenance notes, supporting documents, custody/loan, sale/gift/trade, loss/stolen/recovery, and corrections are owner-scoped and audited. Collector-entered statements remain labeled as collector-recorded unless separately verified.

### Saved Vault Views + large-collection retrieval

Verified through Quality Gates #464, #474, and #475 with current-data saved queries, deterministic keyset pages, query-bound cursors, UUID tie-breaking, responsive saved-view controls, a Load more flow, and `EXPLAIN QUERY PLAN` regression proof for intended paging indexes.

## Truthfulness boundary

Market values remain absent until a real evidence-backed valuation service is implemented. A barcode, image, title match, provider result, AI suggestion, ISBN, catalog ID, receipt, certificate number, grading label, Oracle ID, provider finish list, or collector-entered provenance statement is not automatically authoritative. A valid grading-company certification-number record confirms database data for that certification number; it does not by itself authenticate the physical collectible being presented. Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.

## Current next target

**IMP-005 — Sports-card catalog evidence + grading-cert verification boundaries.**

The next pass will first document lawful/current sports-card catalog access and grading-provider APIs. SportsCardsPro/PriceCharting is a viable paid catalog source but requires subscription credentials and enforces strict call limits; its price-heavy response must be reduced to identification-only evidence if used. PSA offers authenticated certification-number verification and must be modeled as certification-database evidence, not physical-slab authentication. Provider credentials remain server-only, price fields stay outside authoritative valuation, and no cert lookup may silently set ownership, authenticity, grade, or value without explicit evidence rules and collector review.
