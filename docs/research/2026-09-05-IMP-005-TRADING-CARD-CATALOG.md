# IMP-005 Research — Category-Specific Catalog Intelligence: Trading Cards

**Date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**First verified ecosystem target:** Pokémon TCG  
**Follow-up adapter:** Magic: The Gathering / Scryfall after the Pokémon boundary is green.

## Construction-document constraints retained

The locked K.I.N.G.S. Collectibles construction documents remain product authority. Trading-card catalog intelligence must strengthen identification without replacing permanent Kingdom treasure identity, collector approval, evidence provenance, or the separate future valuation authority.

Provider results are **review-only candidates**. No external provider ID, card image, market offer, TCGPlayer price, card number, set number, or AI interpretation may silently become authoritative identity or Kingdom market value.

## Pokémon TCG API V2

Sources:

- https://docs.pokemontcg.io/
- https://docs.pokemontcg.io/getting-started/authentication/
- https://docs.pokemontcg.io/getting-started/rate-limits
- https://docs.pokemontcg.io/api-reference/cards/get-card/
- https://docs.pokemontcg.io/api-reference/cards/card-object/
- https://docs.pokemontcg.io/api-reference/cards/search-cards/
- https://dev.pokemontcg.io/terms
- https://github.com/PokemonTCG/pokemon-tcg-data

Current useful facts:

- V2 is the maintained API; V1 is deprecated.
- HTTPS REST returns structured card and set data.
- API keys are sent by `X-Api-Key` and must not be exposed in client-side code or public repositories.
- Default authenticated allowance is documented as 20,000 requests/day.
- Unauthenticated use is documented as 1,000 requests/day and at most 30/minute.
- Card records expose provider ID, name, set ID/name/series, printed set totals, card number, rarity, artist, types/subtypes, and other identification metadata.
- Card records may also contain TCGPlayer pricing/offer material. That data is intentionally **excluded** from this identification adapter and cannot become Kingdom valuation evidence through this path.
- The Developer Portal terms prohibit API-key sharing and placing undue automated burden on the service.
- The public `PokemonTCG/pokemon-tcg-data` repository exposes the API data, but no explicit license file was found during this pass. The Kingdom therefore does **not** vendor/copy that dataset in this milestone; it uses the documented API contract and keeps provider/source attribution.

### Current provider risk found during research

A 2026 open issue in the Pokémon TCG data repository reports duplicate/missing cards when paging sets with more than 250 cards.

Kingdom consequence: the first adapter does **not** iterate provider set pages or depend on provider pagination for exact identification. It uses exact provider card IDs generated from an explicit set ID + printed card number, or an explicit full Pokémon TCG card ID. This avoids inheriting the reported large-set paging failure into authoritative candidate retrieval.

## TCGdex

Sources:

- https://tcgdex.dev/
- https://tcgdex.dev/rest
- https://tcgdex.dev/faq

Useful current patterns:

- free/no-key Pokémon TCG API;
- multilingual card coverage;
- REST + GraphQL;
- no published hard rate limit, with an explicit request to cache bulk/repeated work;
- strong candidate for later multilingual/fallback enrichment.

Kingdom decision: do not combine two Pokémon sources in the first production slice. A second provider can improve resilience and multilingual coverage later, but only after evidence reconciliation/deduplication rules are explicit.

## Scryfall / Magic: The Gathering

Source inspected:

- https://scryfall.com/docs/faqs/i-m-having-trouble-accessing-the-scryfall-api-or-i-m-blocked-17

Useful current guidance:

- keep API traffic under 10 requests/second;
- send a meaningful `User-Agent` and `Accept` header;
- use HTTPS/TLS;
- use bulk data for high-volume simple lookups rather than repeatedly hitting the API;
- do not retry aggressively through provider rate limits.

Kingdom decision: Scryfall is the next card-ecosystem adapter, but it is deliberately deferred until the Pokémon exact-identifier adapter and shared category-catalog semantics are verified. Magic has richer print/finish/language/card-face semantics and deserves its own evidence mapping rather than being forced into Pokémon fields.

## Kingdom design decision for this slice

1. Add a real `pokemon-tcg` provider behind the existing provider-neutral review-only catalog service.
2. Support **exact** identifier modes only:
   - `pokemon-card-id` — provider card ID such as `base1-4`;
   - `pokemon-set-number` — explicit `setId/cardNumber` or `setId:cardNumber`, normalized to the provider card ID.
3. Fetch one exact `/v2/cards/:id` record; do not page provider set searches.
4. Optional API key remains server-only through runtime configuration and `X-Api-Key`.
5. Conservative serialized provider traffic defaults protect both keyed and unkeyed usage; cache remains above the provider in the shared catalog service.
6. 404 is an honest no-match, not an error disguised as a candidate.
7. 429 and provider failures remain explicit/retryable evidence failures.
8. Bound timeout and response size.
9. Map only identification metadata needed for collector review.
10. Explicitly discard `tcgplayer`, `cardmarket`, prices, offers, and other commerce/valuation material from normalized candidates.
11. Preserve source URL/provider ID/provider record ID in candidate evidence.
12. Add Pokémon identifier types to the Royal Intake Queue and responsive review UI.
13. Copy a candidate only into an **unsaved** treasure editor. Collector review + explicit Save remain mandatory.
14. Store provider evidence identifiers/metadata as attributes/external identifiers without replacing the permanent Kingdom UUID.

## Acceptance criteria

- exact Pokémon card-ID normalization/validation;
- exact set-ID + card-number normalization;
- HTTPS outside local tests;
- optional server-only API key header;
- conservative serialized request interval;
- timeout, response-size, JSON-shape, 404, 429, and 5xx handling;
- review-only candidate containing set/card/rarity/artist/category metadata;
- no provider price/offer/merchant fields in candidate JSON;
- runtime provider composition and capability flags;
- Royal Intake identifier validation/labels;
- responsive candidate summary/editor-prefill behavior;
- domain/provider/runtime/HTTP/UI regression tests;
- full Kingdom quality gates before merge.
