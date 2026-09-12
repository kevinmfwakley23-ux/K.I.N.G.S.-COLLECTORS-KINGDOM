# IMP-005 Research — Evidence-Backed Valuation

**Research date:** 2026-09-11  
**Scope:** collector inventory, scanning, organization, valuation, value history, portability, and seller workflows  
**Rule:** adopt useful interaction and architecture patterns; do not copy proprietary code, branding, datasets, or protected interfaces.

## Products and repositories reviewed

### CollX

Current public positioning emphasizes photo-first sports/TCG identification, fast market-price presentation, portfolio value tracking, filtering/search, community interaction, grading, and buy/sell/trade flows.

**Pattern worth adopting:** low-friction transition from item recognition to collection intelligence.

**Kingdom improvement:** identification must not silently become authoritative identity, and a displayed value must retain evidence context rather than becoming an unexplained permanent field on a treasure.

Source: https://www.collx.app/

### Ludex

Current public material emphasizes photo scanning, card identification, pricing based on sales data, collection organization, binders, portfolio tracking, hobby trends, and fast marketplace listing. Ludex also describes its portfolio as an aggregate of individual estimated card prices.

**Pattern worth adopting:** fast collector feedback, value ranges, and collection-level intelligence.

**Kingdom improvement:** keep asking listings out of sold-comparable estimates, show evidence strength and freshness, and keep raw/graded/condition/currency contexts separate instead of collapsing them into one opaque number.

Sources:
- https://www.ludex.com/
- https://www.ludex.com/features/

### PriceCharting

The current collection tracker supports collection values that change with price updates, historic values, grade/condition/quantity, barcode intake, photos/notes, sold-item history, sale price/date, and profit tracking. Premium features add price-change sorting, dashboards, and grading recommendations.

**Patterns worth adopting:** visible value history, realized-sale tracking, purchase-versus-sale analysis, and simple collector dashboards.

**Kingdom improvement:** valuation and realized financial facts remain separate. Acquisition/sale transactions stay in provenance; market comparables stay in valuation evidence; estimates are derived read models and never rewrite either ledger.

Source: https://www.pricecharting.com/page/collection-tracker

### HomeBox

The open-source HomeBox family demonstrates portable SQLite-backed inventory, categories, locations, tags/custom fields, search, images, documents, purchase tracking, responsive UI, and straightforward backup/deployment.

**Patterns worth adopting:** collector-controlled data, portable storage, rich organization, and broad inventory metadata.

**Kingdom improvement:** the Royal Vault already uses an owner-scoped durable SQLite authority and exports collector data. New valuation evidence must therefore be exportable and must not create provider lock-in.

Sources:
- https://github.com/sysadminsmedia/homebox
- https://github.com/Ivanchinko2000/homebox

### OmniCard

The open-source OmniCard project combines bulk card scanning, perceptual hashing/OCR, manual search, storage locations, set completion, missing-card reports, decklist checking, CSV import/export, sealed-product inventory/valuation, a phone/web companion, and a SQLite-backed local data model.

**Patterns worth adopting:** high-throughput intake, location-aware collection management, interoperability, completion views, and shared desktop/mobile access.

**Kingdom improvement:** scanning and market intelligence remain evidence-producing assistants. Permanent treasure identity and ownership stay under collector authority.

Source: https://github.com/anubisascends/OmniCard

## Valuation source constraints

The Kingdom must not scrape or redistribute commercial price datasets merely because another product displays them. Automatic market providers will be integrated only where the provider's API, license, contract, or explicit permission allows the Kingdom's intended use.

For this foundation, no commercial third-party market dataset is copied into the repository and no provider-specific market number is presented as authoritative truth.

## Adopted design for this milestone

1. **Append-only comparable evidence** — sold comparables and asking listings are durable evidence records with source name, source URL/reference, observed date, integer amount, currency, item state, condition/grade context, notes, SHA-256 integrity evidence, and optional correction linkage.
2. **Sold and asking are different evidence classes in use** — asking listings remain visible context but never influence the computed estimate.
3. **No cross-currency arithmetic** — USD, CAD, EUR, and other currencies remain separate until a future explicitly sourced FX policy exists.
4. **No raw/graded collapse** — raw, graded, sealed, and other states are separate buckets. Graded evidence also requires grading company and grade label.
5. **Condition-aware raw evidence** — raw records can carry condition labels and are bucketed accordingly.
6. **Freshness gate** — only sold comparables observed within 180 days qualify for the current estimate.
7. **Minimum evidence gate** — fewer than three recent sold comparables produces no estimate, not a guessed value.
8. **Robust center statistic** — the first estimate uses the median of up to 20 recent sold comparables, while still showing the low/high range, sample count, distinct named-source count, and evidence-strength warning.
9. **Append-only corrections** — a mistaken comparable is corrected by a linked replacement record. Original evidence is retained and excluded from active estimates once corrected.
10. **Collector ownership and portability** — valuation evidence is owner-scoped and included in Vault export.
11. **No authoritative market-value mutation** — the treasure record is not silently assigned a permanent market value by this service.
12. **No appraisal claim** — every computed value is advisory market evidence, not a professional appraisal, guaranteed sale price, or grading outcome.

## Deliberately not implemented in this milestone

- scraping marketplace pages;
- importing a commercial price guide without licensed API/contract authority;
- automatic currency conversion;
- one-number collection valuation across incompatible evidence buckets;
- marketplace listing or payment execution;
- automatic grading-value uplift assumptions;
- deleting or editing historical market evidence in place;
- claims that collector-recorded source evidence has been independently authenticated.

## Next valuation increments after this foundation is green

1. provider-adapter contract for legally usable sold-comparable feeds;
2. explicit source provenance/freshness status per provider observation;
3. link realized sales from the provenance ledger to valuation history without conflating them;
4. value-history snapshots derived from immutable evidence;
5. collection-level rollups only where currency and evidence compatibility are explicit;
6. anomaly/outlier review tools that explain exclusions rather than hiding them;
7. collector-selectable comparison policies for category-specific markets;
8. Keeper explanations that cite the exact evidence records used in each recommendation.

## Competitive conclusion

The Kingdom should not attempt to win by displaying the fastest unexplained price. It should combine the intake speed and organization patterns collectors already value with stronger evidence traceability, data ownership, correction history, grade/condition separation, and honest refusal when the market evidence is insufficient.
