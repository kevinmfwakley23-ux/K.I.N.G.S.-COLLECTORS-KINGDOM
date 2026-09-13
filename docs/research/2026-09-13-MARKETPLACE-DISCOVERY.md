# Kingdom Street Market — Discovery Search & Refinement Research

**Date:** 2026-09-13  
**Branch:** `marketplace/discovery-search`  
**Depends on:** green Marketplace listing foundation at `6686fc47eeadf96a6afc9af50acfca5077fbfa34`

## Goal

Make the Kingdom Street Market useful once active listings grow beyond a handful without weakening the listing foundation's evidence and privacy boundaries.

Discovery operates only on the frozen representation a seller actually published and only while the backing Vault treasure still supports the offered quantity. It does not search private acquisition cost, owner notes, storage location, private provenance, or seller account identifiers.

## Current official-marketplace patterns reviewed

### eBay Browse / search filtering

Official documentation reviewed:

- https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
- https://developer.ebay.com/api-docs/buy/browse/static/ref-buy-browse-filters.html

Useful product lessons:

- keyword search and structured refinement must work together;
- category, condition, price, currency and delivery-related refinement are baseline marketplace discovery tools;
- price filtering is paired with currency rather than pretending unlike currencies are directly comparable.

Kingdom-native adaptation:

- multi-term search runs across the exact public representation fields: title, category, manufacturer, series, variant, condition and seller description;
- all query terms use AND semantics so adding a term narrows rather than unpredictably broadens results;
- category, currency and fulfillment filters can be combined;
- minimum/maximum price requires an explicit currency;
- price sorting also requires an explicit currency;
- no exchange-rate conversion is invented in this phase;
- category/currency/fulfillment facets come from currently supported active Kingdom listings, not a fabricated static taxonomy.

### TCGplayer marketplace discovery patterns

Current TCGplayer marketplace/search workflows reinforce category/product/set/printing/condition/price refinement as core collector-discovery behavior.

Kingdom-native adaptation:

- one universal collector search surface works across Kingdom categories rather than creating a card-only discovery model;
- listing facts remain category-neutral so sports cards, trading cards, comics, coins, games and future collectible types can share the same discovery engine;
- category-specific advanced attributes can later extend this boundary without changing the permanent listing identity.

No competitor source code, ranking algorithm or proprietary UI was copied.

## Trust decisions

### Currency safety

Price fields are stored as integer minor units plus a three-letter currency. Discovery refuses:

- a minimum price without currency;
- a maximum price without currency;
- low-to-high price ordering without currency;
- high-to-low price ordering without currency.

The API returns `crossCurrencyPriceComparison: false` and `priceRangesRequireCurrency: true` so clients do not have to infer this rule.

The browser uses `Intl.NumberFormat` currency metadata to respect currencies whose minor-unit precision differs from USD rather than assuming every currency has exactly two decimal places.

### Live Vault support remains authoritative

Search/facet queries retain the listing-foundation join to the live Vault row. An active listing is publicly discoverable only while:

- the backing treasure still exists for the same seller;
- the treasure is not archived;
- current Vault quantity is at least the published offered quantity.

Seller listing history remains visible privately even when public discovery suppresses the offer.

### Representation integrity remains authoritative

Discovery maps every returned listing through the same SHA-256 published-representation integrity verification used by direct public listing reads. Search does not create a weaker alternate read path.

## Search contract

Supported public query parameters on `GET /api/marketplace/listings`:

- `q` — up to 160 characters / at most 12 normalized searchable terms;
- `category` — exact case-insensitive category match;
- `currency` — three-letter code;
- `fulfillment` — `shipping`, `local-pickup`, or `shipping-or-pickup`;
- `minAmountCents` — non-negative integer minor units, requires currency;
- `maxAmountCents` — non-negative integer minor units, requires currency;
- `sort` — `newest`, `title`, `price-asc`, `price-desc`; price sorts require currency;
- `limit` — 1 through 100.

The response includes:

- `listings` — sanitized active representations;
- `appliedFilters` — normalized filters actually used;
- `facets` — total active count plus category/currency/fulfillment counts;
- explicit multi-currency safety flags;
- existing commerce truth flags showing checkout/payment/settlement/buyer-protection/ownership-transfer remain unavailable.

## Shareable discovery state

The Street Market writes meaningful discovery filters into the page URL using `history.replaceState`. A direct visit to that URL restores category, currency, fulfillment, price range, sort and query before the first discovery request.

A small pre-bootstrap script restores URL values before the main module runs so the first response cannot temporarily disagree with the shared URL. It preserves a selected facet even when the current market contains zero matching options, allowing a truthful zero-result state instead of silently erasing the user's request.

## UI behavior

- primary search remains visible without opening advanced refinement;
- category/currency/fulfillment option counts are populated from live server facets;
- minimum/maximum price and price-sort options stay disabled until currency is selected;
- active filters are summarized as readable chips;
- zero-result copy distinguishes "no active market" from "no match for these filters";
- mobile layout collapses to one-column controls;
- keyboard focus and the existing reduced-motion rules remain intact;
- no fake commerce action is introduced.

## Verification

Discovery adds dedicated coverage for:

- multi-field AND keyword matching;
- combined structured filters;
- currency-scoped price range and price ordering;
- explicit rejection of cross-currency price operations;
- live facet counts and suppression of archived Vault support;
- deterministic newest/title/price ordering;
- real public HTTP query parsing and errors;
- discovery UI artifact contracts;
- shareable URL bootstrap behavior;
- production `dist` artifact presence and contracts.

## Next discovery work after integration

Once real listing volume justifies it, the next evidence-backed discovery improvements should be cursor pagination, category-specific structured attributes, saved searches/watchlists, seller reputation once seller identity/KYC exists, and market-observatory alerts. Relevance ranking should not become a hidden pay-to-win system; sponsored placement, if ever introduced, must be separately labeled and never silently contaminate organic relevance.
