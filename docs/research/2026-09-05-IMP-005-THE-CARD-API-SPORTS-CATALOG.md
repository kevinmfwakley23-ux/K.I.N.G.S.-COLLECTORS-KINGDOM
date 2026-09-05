# IMP-005 Research — Sports-Card Catalog Identity via The Card API

**Research date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Implementation branch:** `imp-005-the-card-api-sports-catalog`

## Purpose

Choose a lawful, production-oriented sports-card catalog source for exact identification evidence without mixing catalog identity with market value, grading, physical authentication, provenance, or ownership.

## Official sources reviewed

### The Card API

- API reference: https://www.thecardapi.com/docs
- Pricing: https://www.thecardapi.com/pricing
- Terms: https://www.thecardapi.com/terms

Current official documentation describes a structured Catalog API with permanent typed identifiers:

- `UC-` UCID for cards;
- `US-` USID for sets;
- `UP-` UPID for players;
- `UF-` UFID for set families.

The documentation states that typed IDs are permanent and never reused, while display slugs are not join keys. Exact `set_id + card_number` search is documented as a one-record existence check. Parallels and inserts can expose a parent set, and serial-numbered parallels can expose `print_run`.

The catalog taxonomy has stable top-level category IDs including `sports`, `trading_card_games`, and `entertainment`. This is important because The Card API also covers non-sports card classes; the Kingdom sports-card adapter therefore verifies the referenced set and requires `category === "sports"` before producing a sports-card candidate.

Catalog access currently requires Pro/Enterprise or the eligible Builder Catalog add-on. Catalog usage has a separate daily record allowance and response headers expose catalog remaining/limit information. The Kingdom must not represent an API key as proof of entitlement before a real request succeeds.

Current terms explicitly permit commercial applications and in-product display/storage under paid-plan limits, while the free tier is personal/non-commercial and does not permit persistent local storage of API responses. Terms also prohibit redistributing the underlying catalog as a standalone/competing dataset. The Kingdom therefore treats this as an optional server-side paid integration, not a bundled free database.

### Beckett

- Public graded-card lookup: https://www.beckett.com/grading/card-lookup

Beckett provides a human-facing certification lookup for BGS/BVG/BCCG and explicitly encourages buyers to use the lookup before purchasing graded cards. The reviewed official page is web-form based and reCAPTCHA protected. No supported public automation API was identified in the official material reviewed for this pass. Do not scrape or automate around those controls.

### SGC

- Public cert verification: https://www.gosgc.com/auth-code

SGC provides a human-facing certification-code lookup. The reviewed official material did not expose a supported public automation API for Kingdom server integration. Keep SGC verification manual/deep-link only until a documented API or written integration agreement exists.

### CGC Cards

- Public cert verification: https://www.cgccards.com/certlookup/

CGC's public verification tool confirms database description/grade and can display holder images; it also applies search limits to protect the database. The reviewed official material did not identify a supported public automation API. Do not bypass public lookup limits or scrape the verification interface.

## Implementation decision

The first sports-card catalog adapter uses **The Card API Catalog API only** and supports two exact review modes:

1. `sports-card-ucid` — exact permanent UCID lookup;
2. `sports-card-set-number` — exact `setUSID/cardNumber` lookup.

For both modes, the adapter verifies the referenced set using `/catalog/sets/{USID}` and requires the provider taxonomy to classify it as `sports` before a candidate is returned.

## Allowed normalized evidence

The adapter may retain bounded identification metadata such as:

- UCID;
- set USID;
- parent-set USID/name where returned;
- subject/player text;
- set name;
- printed card number;
- category/subcategory/sport;
- year;
- manufacturer where returned;
- rookie/autograph/relic flags where returned;
- print run where returned;
- provider slug as display metadata only.

Provider IDs remain supporting catalog evidence. Permanent Kingdom treasure UUIDs remain the physical-item identity.

## Explicit exclusions

This IMP-005 path does **not** call The Card API Market/Sales API and does not normalize or import:

- sale prices;
- market prices;
- transaction history;
- valuation estimates;
- auction/listing URLs;
- images;
- grading claims from sales data;
- slab serial/cert data from sales records.

Market/sales intelligence is a separate future valuation milestone with separate licensing, evidence, stale-data, currency, aggregation, outlier, and user-disclosure requirements.

## Truthfulness boundary

A catalog match does not prove that the physical card in front of the collector is the matched printing/parallel. Parent-set, print-run, rookie, auto, and relic fields are provider metadata that require collector review against the physical item. No catalog lookup may automatically set physical variant/parallel, condition, grade, authenticity, provenance, ownership, purchase price, market value, or Marketplace state.

A grading-company certification lookup is a different evidence class from catalog identity. PSA remains the only automated grading-cert provider currently implemented because it has a documented authenticated API. Beckett, SGC, and CGC remain manual/deep-link research targets until a supported automation interface or written permission is available.

## Security and operational rules

- API key is server-only (`KINGDOM_CARD_API_KEY`).
- External transport is HTTPS-only; localhost HTTP is allowed for tests.
- Timeouts and maximum response size are bounded.
- Requests are serialized with conservative internal spacing.
- 401, subscription/plan denial, 429, timeout, upstream failure, malformed data, category mismatch, identifier mismatch, and ambiguous exact results fail explicitly.
- No retry-through loop is used to defeat plan/rate limits.
- Catalog entitlement is verified by provider response, not assumed merely because a key is configured.
- The current shared catalog cache remains bounded and must not be expanded into bulk persistent provider-dataset storage without checking the active plan's storage rights.

## Future research targets

- written/API integration options for Beckett, SGC, and CGC;
- exact parallel-disambiguation workflows after physical-review UI improves;
- sports-card player/set discovery that remains review-first rather than fuzzy auto-identification;
- separate, evidence-backed market valuation architecture with licensed sales/comps data;
- storage-right enforcement if persistent provider catalog caching grows beyond the current bounded in-memory evidence cache.
