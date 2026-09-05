# IMP-005 Research — UPC / EAN / GTIN Catalog Candidate Provider

**Date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Purpose:** determine whether a real retail-code provider can safely support review-only collectible identification without becoming authoritative Vault identity or valuation data.

## Sources reviewed

Official UPCitemdb resources:

- Plan comparison: https://www.upcitemdb.com/wp/docs/main/development/plan/
- API rate limits: https://www.upcitemdb.com/wp/docs/main/development/api-rate-limits/
- Response schema: https://www.upcitemdb.com/wp/docs/main/development/responses/
- Getting started: https://www.upcitemdb.com/wp/docs/main/development/getting-started/
- API overview: https://upcitemdb.com/api
- Terms: https://www.upcitemdb.com/terms
- Documentation index/disclaimer: https://www.upcitemdb.com/wp/docs/main/

## Verified provider constraints

### Free plan

Current official documentation states that the free plan:

- requires no signup;
- uses `https://api.upcitemdb.com/prod/trial/lookup` for lookup;
- allows 100 combined requests per day;
- allows a burst of up to 6 lookup requests per minute;
- documents a sustainable rate of 1 request per 10 seconds;
- is primarily rate-limited per source IP;
- provides the same database-access class as paid plans but with lower traffic limits.

The Kingdom therefore defaults the UPCitemdb adapter to a 10-second minimum request interval and one serialized request stream. Cache hits do not consume provider requests.

### Paid plan compatibility

Paid plans use `/prod/v1/lookup` and require `user_key` and `key_type` request headers. The Kingdom supports an optional server-side `KINGDOM_UPCITEMDB_USER_KEY`. No provider key is exposed to browser JavaScript or persisted in Vault records.

### Rate-limit state

UPCitemdb documents these response headers:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

HTTP 429 indicates rate exhaustion. The Kingdom parses these headers, reports provider rate limiting explicitly, and never converts rate-limit failure into a fabricated catalog candidate.

### Supported identifier evidence

UPCitemdb lookup accepts UPC, EAN and GTIN identifiers. The Kingdom performs local GS1 check-digit validation before making an outbound request and only sends 8-, 12-, 13- or 14-digit valid retail identifiers.

This prevents arbitrary Code 128 text, QR contents, serial numbers or custom identifiers from being sent to the retail product provider merely because they came from a barcode scanner.

## Provider data is not authoritative

UPCitemdb's documentation states that its information is provided as-is without guarantees of availability or accuracy. A provider hit therefore remains **candidate evidence**.

Kingdom rules:

1. Provider IDs never replace the permanent Kingdom treasure ID.
2. A result is marked `reviewRequired`.
3. Lookup performs no Vault mutation.
4. The collector must review the candidate in an unsaved treasure editor and explicitly save a record.
5. Category is not automatically asserted from UPCitemdb's provider category.
6. Existing manual entry remains available when no provider match exists or the provider is unavailable.

## Price and merchant data boundary

UPCitemdb's response schema can contain:

- `lowest_recorded_price` / `highest_recorded_price`;
- `offers`;
- merchant names, domains and offer prices;
- image URLs.

Its API documentation also explains that some Amazon/eBay sales information shown on the website cannot be redistributed through the API because of network/affiliate restrictions.

Collector's Kingdom therefore treats UPCitemdb as an **identification metadata provider only**. The adapter uses an explicit allowlist and intentionally drops:

- all provider prices;
- all offer objects;
- merchant links/domains;
- marketplace sale assertions;
- provider images.

Those fields cannot populate market value, purchase price, trade value, or Marketplace state. Future valuation must use a separate evidence/valuation authority with its own licensing, provenance, timestamps, confidence and market-method rules.

## Normalized metadata allowed into review candidates

The retail adapter currently permits only:

- title;
- manufacturer / brand;
- description;
- model;
- color;
- size;
- provider category as a non-authoritative custom attribute;
- UPC / EAN / GTIN evidence identifiers;
- provider name and evidence reference.

The browser draft mapper also independently allowlists fields before placing them in an unsaved editor.

## Implemented safeguards

- HTTPS-only provider URL outside localhost testing.
- Optional paid key accepted only through runtime configuration.
- 5-second default provider timeout.
- 256 KiB protected response-size ceiling.
- 10-second default serialized request interval for free-plan sustainability.
- GS1 check-digit validation before outbound lookup.
- explicit 429 handling and rate metadata capture.
- bounded candidate count.
- server-side cache shared through the provider-neutral catalog service.
- authenticated Kingdom catalog API with private/no-store HTTP caching policy.
- no browser-to-provider direct calls.
- no automatic treasure creation.
- no automatic category assertion for retail candidates.
- no price/offer/merchant mapping.
- regression tests proving lookup does not change Vault treasure count.

## Verification checkpoint

Integrated UPC/EAN catalog candidate resolution passed **Kingdom Quality Gates #396**, workflow run `33961349239`, on code commit `3175e5f74f55c0dca4d72ed634b572128d032044`.

The quality gate verifies lint, module contracts, automated tests, production build, production artifact requirements, and production dependency audit.

## Limitations / next research

- The free UPCitemdb plan is appropriate for low-volume collector review, not high-volume automatic enrichment.
- Provider results can be absent, stale, ambiguous or wrong and must remain review-only.
- The current retail provider is not a source for collectible-specific variants, grading, printings, sets, card numbers, comic issues, game editions, autographs or provenance.
- Category-specific providers for trading cards, comics, games, vinyl and other collectible domains require separate current API/licensing research before integration.
- Market/trade valuation remains deliberately outside this catalog-candidate layer.
