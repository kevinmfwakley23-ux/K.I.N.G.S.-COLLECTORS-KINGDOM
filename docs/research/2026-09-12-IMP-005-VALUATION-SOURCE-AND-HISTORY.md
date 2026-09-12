# IMP-005 Research — Valuation Sources, Realized Sales, and Value History

**Research date:** 2026-09-12 (America/Denver)  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Decision scope:** valuation-source adapters, realized-sale linkage, value-history architecture, and competitive collector workflows.

## Executive decision

The Kingdom should continue toward evidence-backed value history, but it must not pretend that a lawful automatic sold-comparable feed exists before one is actually licensed and available.

This research supports the following implementation order:

1. link the Kingdom's own append-only `sold` provenance events into a derived value-history read model;
2. preserve every valuation evidence record and every realized sale as a separately identified source record;
3. keep realized owner sales out of the current market-comparable estimate unless a future explicit policy says otherwise;
4. keep currencies, raw/graded/sealed states, conditions, grading companies and grades distinct;
5. define provider adapters around provenance/freshness/licensing metadata rather than around a naked price number;
6. enable an automatic provider only after its present terms and access model explicitly support the Kingdom's intended use.

No provider was enabled by this research merely because a public webpage, marketplace screen, or unofficial scraper can expose prices.

---

## Leading collector products reviewed

### Ludex

Official product/help material emphasizes rapid camera scanning, card verification, a price estimate, last sold information, recent eBay sales, configurable sales filters, price reports over multiple time ranges, collection value and seller workflows.

Useful pattern:
- make capture fast;
- show the collector the evidence behind a value;
- make condition/parallel/graded distinctions visible;
- connect collection management to an eventual selling workflow.

Kingdom improvement:
- exact evidence records remain auditable and append-only;
- an estimate is not silently promoted to authoritative market value;
- provider identity and physical treasure identity stay separate.

Sources:
- https://help.ludex.com/
- https://www.ludex.com/

### CollX

CollX combines image-assisted identification, pricing, collection tracking and a marketplace. Its marketplace supports asking prices and multi-item negotiated deals.

Useful pattern:
- collection-to-marketplace continuity;
- negotiated bundle offers rather than one-item-only commerce;
- rapid image-assisted intake.

Kingdom improvement:
- image matches remain review evidence instead of permanent treasure identity;
- Marketplace ownership transfer must eventually be transactional and explicit;
- valuation observations remain separate from asking listings and sale settlement.

Sources:
- https://www.collx.app/
- https://collx.app/faq/

### Collectr

Collectr emphasizes portfolio value, gains/losses, collection charts, trade analysis, raw/graded pricing, historical price views, scanning and social/community surfaces.

Useful pattern:
- portfolio-level history rather than only per-item current price;
- cost-basis and gain/loss context;
- trade comparison tools;
- cross-device collector workflow.

Kingdom improvement:
- portfolio rollups should only aggregate compatible currencies/evidence classes;
- source evidence should remain reachable from every explanation;
- no silent currency conversion should occur without an explicit FX policy.

Source:
- https://www.getcollectr.com/

### PriceCharting

PriceCharting combines collection tracking, grade/condition/quantity, value history and a collector's own sold price/date/profit tracking. Its documented API can expose current values, but the API documentation explicitly says historic prices and historic sales are not supported.

Useful pattern:
- realized sale price/date/profit belongs in the collection's lifecycle history;
- historical value should be visible as a timeline rather than only a present number.

Critical provider limitation:
- the documented paid API is not a sold-history provider for the Kingdom's intended automatic comparable ingestion.

Sources:
- https://www.pricecharting.com/pricecharting-pro
- https://www.pricecharting.com/api-documentation

### Card Ladder

Card Ladder presents a large vetted multi-market sales-history database, current estimates, indexes, grading population context and collection tracking. Its public site states that it tracks public sales across eBay, Goldin, Heritage, Fanatics and other platforms and provides long historical depth.

Useful pattern:
- valuation confidence improves when sales are normalized and vetted across multiple sources;
- collectors benefit from both individual sale evidence and market-level analytics.

Kingdom improvement:
- a future provider observation should carry the exact provider/source identity, observation date, item state, grading context and evidence ID that justified an estimate;
- a licensed data relationship is required before importing a commercial provider's sales data.

Sources:
- https://www.cardladder.com/
- https://www.cardladder.com/pro-features/sales-history

### CLZ Comics + CovrPrice

CLZ Comics demonstrates category-specialized catalog depth: barcode and cover intake, issue/variant metadata, storage location, purchase price/store/date, grade/grading company, signatures, multiple collections, cloud sync and optional value integration through CovrPrice.

Useful pattern:
- each collectible category benefits from specialized metadata and intake rather than forcing every object through one generic form;
- location, purchase, grading and category metadata should remain first-class;
- mobile capture and desktop management should cooperate.

Kingdom improvement:
- maintain one permanent treasure identity while allowing category-specific evidence modules;
- preserve collector data portability and provider independence.

Source:
- https://clz.com/comics/mobile

### Discogs

Discogs supports collection folders/custom fields and shows an estimated collection value based on recent Marketplace sales history. Its help material explicitly describes the estimate as approximate and excludes items without sales history from that value.

Useful pattern:
- missing evidence should reduce coverage instead of being filled with invented values;
- collection totals need visible valuation coverage.

Kingdom improvement:
- collection rollups should expose how many treasures are valued, which evidence classes were used, and which currencies/buckets were excluded.

Source:
- https://support.discogs.com/hc/en-us/articles/360007331534-How-Does-The-Collection-Feature-Work

### hobbyDB

hobbyDB combines collection management, estimated value, value-history charts, gains/losses from price paid, marketplace sale/trade, images and community/human-vetted price points from many sources.

Useful pattern:
- human review can improve price-point quality;
- value history, gains/losses, collection subsets and marketplace lifecycle are valuable together;
- a sold marketplace item can become part of ownership history.

Kingdom improvement:
- human or provider review should be represented as explicit evidence authority rather than erasing the original observation;
- marketplace transfer and valuation history should share references while retaining separate ledgers.

Sources:
- https://help.hobbydb.com/support/solutions/articles/36000264299-your-collection-s-overall-value-top-ten-other-stats
- https://www.hobbydb.com/

---

## Open-source implementations reviewed

### HomeBox — `sysadminsmedia/homebox`

Patterns worth retaining:
- portable SQLite-backed inventory;
- locations, categories, tags and custom fields;
- images/documents;
- responsive device support;
- simple deployment and backup posture.

Kingdom distinction:
- Collector's Kingdom adds permanent treasure identity, provenance, grading evidence, collectible-specific intelligence and eventual marketplace transfer.

Repository:
- https://github.com/sysadminsmedia/homebox

### Foilstack — `foilstack/foilstack`

Foilstack is especially relevant because it deliberately treats a machine match as evidence rather than an answer. Its review queue shows competing matches, and automatic acceptance is conservative. Its plugin design also separates source plugins, enrichment plugins and export mappings. Its price-history design records source changes rather than treating the current upstream value as reconstructible history.

Patterns worth adopting:
- source adapter is a first-class boundary rather than a special-case integration;
- network-capable source plugins are deliberately installed/configured;
- ambiguous joins are dropped rather than guessed;
- upstream identifiers and source spellings are preserved;
- historical observations are durable because upstream current-price endpoints may not reconstruct the past;
- backfills add missing history and do not overwrite authoritative existing days.

Kingdom distinction:
- Collector's Kingdom needs multi-category adapters and stricter evidence/authority labels;
- a market-source adapter must declare licensing/terms compatibility and freshness, not only technical reachability.

Repositories/docs:
- https://github.com/foilstack/foilstack
- https://github.com/foilstack/foilstack/blob/main/docs/plugins.md
- https://github.com/foilstack/foilstack/blob/main/docs/prices.md

### OpenBinder — `whoppercheese/open-binder`

Patterns worth adopting:
- mobile-first PWA;
- multiple binder/collection workflows;
- checklist versus owned inventory distinction;
- quick-add and multi-select workflows;
- read-only offline collection mirror;
- explicit sync status.

Kingdom distinction:
- the Royal Vault is category-agnostic and location/provenance centric rather than Pokémon-only;
- sensitive authenticated records should not be silently cached by the service worker.

Repository:
- https://github.com/whoppercheese/open-binder

---

## Automatic market-provider feasibility

### eBay

The public Buy/Browse API is designed around searchable active inventory. It is useful for marketplace discovery/asking context, but active listings are not realized sales.

The eBay Marketplace Insights API is the natural historic-sales surface, but eBay's current documentation says access is restricted and not open to new users.

Decision:
- **do not implement a fake 'eBay sold API' adapter by scraping search pages or relabeling active listings as sold comparables**;
- keep eBay active-listing integration, if later added, as asking-listing context unless a licensed sold-data path is obtained.

Sources:
- https://developer.ebay.com/api-docs/buy/browse/overview.html
- https://developer.ebay.com/api-docs/buy/static/ref-buy-field-filters.html

### PriceCharting

PriceCharting documents API/CSV access to current item values. Its API documentation explicitly states that historic prices and historic sales are not supported.

Decision:
- PriceCharting may be evaluated later as a current-price observation source under its paid terms;
- it is **not** treated as the Kingdom's automatic realized-sale history feed.

Source:
- https://www.pricecharting.com/api-documentation

### Cardmarket

Cardmarket's current help page says it is not accepting applications for API access. Existing access is tightly controlled; current terms also restrict how API data and prices may be presented without agreement. Cardmarket has separately announced downloadable catalog/price-guide datasets, which may be useful for category catalog/asking-price research but are not assumed to be realized-sales evidence.

Decision:
- do not build a production Cardmarket API dependency without approved access and terms review;
- separately investigate officially downloadable datasets if a TCG catalog/current-price adapter becomes a priority.

Sources:
- https://help.cardmarket.com/en/cardmarket-api
- https://www.cardmarket.com/en/Magic/Policies/GeneralTermsAndConditions
- https://insight.cardmarket.com/en/Articles/the-state-of-cardmarket-2024

### TCGCSV pattern

Foilstack demonstrates a useful technical pattern around TCGCSV: inspect the upstream build timestamp, avoid unnecessary re-downloads, pace requests, keep printing-specific prices distinct and persist changes because current-day feeds cannot reconstruct every missed historical day.

Decision:
- investigate TCGCSV directly before any Kingdom integration, including present usage/redistribution terms and category coverage;
- if approved, store source/build timestamp and exact printing identity with every imported observation;
- never let a TCG catalog/provider ID replace the Kingdom treasure UUID.

---

## Architecture requirements derived from the research

A production market observation adapter should eventually return a normalized observation with, at minimum:

- provider identifier and provider observation identifier;
- source name and auditable URL/reference where terms permit;
- observation type (`sold-comparable`, `asking-listing`, or another explicitly governed type);
- observed/effective date and provider retrieval timestamp;
- source freshness/build timestamp where available;
- integer amount and ISO-4217-style three-letter currency code;
- raw/graded/sealed/other item state;
- condition label where relevant;
- grading company and grade when graded;
- provider item/printing identity as supporting evidence only;
- licensing/terms policy identifier used by the adapter;
- immutable evidence hash once persisted;
- explicit evidence authority/class and verification status.

The adapter must fail closed when required context is missing. It must not mutate treasure identity, ownership, authoritative grade, authenticity or provenance.

---

## Value-history design selected for this branch

The first implementation slice derives value history from records the Kingdom already owns:

1. append-only valuation evidence remains in `vault_valuation_evidence`;
2. append-only collector provenance remains in `vault_provenance_events`;
3. `sold` provenance events are projected into the valuation snapshot as `realized-sale` history entries;
4. each history entry exposes its exact source record ID;
5. provenance corrections mark the original sale as corrected and retain correction IDs instead of rewriting the sale;
6. unpriced sale events remain visible but do not create a value;
7. realized sales do not enter the current comparable-based estimate;
8. currencies are never silently aggregated;
9. history is a derived read model, not a mutable authoritative market-value field;
10. isolated valuation runtimes without provenance remain operational and truthfully report that provenance linkage is unavailable.

This gives the collector useful sale/value history now without waiting for a commercial market-data contract and without lowering the Kingdom's evidence standard.

---

## Next research/build targets

After this realized-sale/history slice is verified:

1. formalize the provider-neutral observation adapter contract and license/freshness policy metadata;
2. investigate officially permitted current-price/category feeds by collectible category;
3. build immutable dated value snapshots only from explicit evidence buckets;
4. add collection-level valuation coverage/rollups without silent FX conversion;
5. make Keeper valuation explanations cite exact evidence and provenance record IDs;
6. research Marketplace transaction/settlement architecture so a completed Kingdom sale can atomically create ownership-transfer and realized-sale evidence without merging those authorities.
