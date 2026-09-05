# IMP-005 Research — Magic: The Gathering Catalog Intelligence via Scryfall

**Date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Target:** exact MTG printing evidence behind the existing provider-neutral review-only catalog boundary

## Mission

Add useful Magic: The Gathering catalog intelligence without turning a provider match into physical authentication, finish selection, condition/grade certainty, ownership/provenance, or Kingdom valuation.

The first Scryfall slice supports two exact evidence keys:

- `mtg-scryfall-id` — exact Scryfall printing UUID;
- `mtg-set-number` — exact `setCode/collectorNumber`, for example `lea/233`.

## Current Scryfall traffic guidance

Primary source:

- https://scryfall.com/docs/faqs/i-m-having-trouble-accessing-the-scryfall-api-or-i-m-blocked-17

Current guidance inspected on 2026-09-05 says:

- keep `api.scryfall.com` traffic **under 10 requests per second**;
- do not ignore/retry through HTTP 429 until requests succeed;
- use bulk data for large amounts of simple lookups or large downloads;
- send a meaningful `User-Agent` rather than accepting a junk/default library value;
- send an `Accept` header; Scryfall gives `application/json;q=0.9,*/*;q=0.8` as a good API value;
- use HTTPS/TLS rather than relying on redirects;
- avoid excessive redundant requests.

### Kingdom transport decision

The first adapter uses:

- HTTPS-only external base URL (local HTTP allowed only for tests);
- explicit `User-Agent` identifying K.I.N.G.S. Collector's Kingdom and optional configured catalog contact email;
- Scryfall's recommended JSON-oriented `Accept` value;
- GET only;
- default 150 ms serialized interval, about 6.7 requests/second, deliberately below the published 10 requests/second ceiling;
- shared catalog cache above the provider;
- no automatic retry loop;
- explicit 429 failure with `Retry-After` surfaced when available;
- timeout and maximum response-byte limits.

The 150 ms interval is an internal Kingdom safety margin, not a claim that Scryfall mandates exactly 150 ms.

## Printing identity and Oracle identity

Current Scryfall-compatible card models expose separate identifiers and print metadata including:

- `id` — Scryfall printing ID;
- `oracle_id` — identity shared by printings representing the same Oracle card concept;
- `set` and `collector_number` — printing-level catalog location;
- `lang` — language of the returned printing;
- `finishes` — finishes available for the printing;
- `layout`, `frame`, `border_color`, `promo`, `digital`, `reprint`, and `variation` — useful print descriptors.

Reference implementation inspected:

- https://github.com/ChiriVulpes/scryfall-sdk/blob/main/src/api/Cards.ts

The direct exact-print path `GET /cards/:code/:number` is also used by current Scryfall client tooling for set-code + collector-number resolution.

Reference inspected:

- https://github.com/ianos93/scryfall-image-downloader

## Kingdom truthfulness rules

### Exact provider match means

A successful Scryfall lookup means Scryfall returned the requested printing UUID or the requested set code + collector number.

It does **not** prove:

- the physical card in the collector's hand is authentic;
- a particular finish from Scryfall's `finishes` array is the collector's physical finish;
- condition or professional grade;
- language if the collector is entering a different localized physical copy than the returned printing;
- provenance or ownership history;
- purchase price or current market value;
- that an Oracle ID is a permanent physical-item identity.

### Finish rule

`finishes` is retained only as **available finish evidence**. The authoritative treasure `variant`/finish remains unselected until the collector explicitly confirms the physical copy.

### Oracle-ID rule

Oracle ID may be retained as supporting card-concept metadata. It must not replace:

- Scryfall printing ID for print-specific evidence;
- the permanent Kingdom treasure UUID for physical-item identity.

### Commerce and valuation rule

Scryfall card objects may include fields such as prices, purchase links, marketplace/provider IDs, related links, and image URIs.

The first catalog adapter deliberately excludes:

- `prices`;
- `purchase_uris`;
- store/affiliate links;
- `image_uris`;
- marketplace price material.

Identification/catalog evidence cannot become authoritative Kingdom valuation through this path. Valuation remains a separate future evidence system with its own market/date/condition/grade rules.

## Normalized candidate fields

The first adapter permits only bounded review metadata such as:

- title/name;
- set code/name;
- collector number;
- language;
- rarity;
- release date;
- artist;
- layout;
- type line;
- frame;
- border color;
- available finishes;
- promo/digital/reprint/variation booleans;
- bounded card-face name/type summaries for multiface layouts;
- Scryfall printing ID;
- Scryfall Oracle ID;
- exact lookup code and provider source URL.

## Royal Intake integration

The Royal Intake Queue gains:

- `mtg-set-number` — `setCode/collectorNumber` or `setCode:collectorNumber`;
- `mtg-scryfall-id` — exact printing UUID.

A pending Magic identifier can request a Scryfall candidate through the same authenticated `/api/catalog/candidates` route used by books, retail codes, and Pokémon.

Copying a candidate opens a **new unsaved treasure editor** and may prefill:

- title;
- category = Trading Card;
- manufacturer/publisher = Wizards of the Coast;
- set name as series;
- the collector-entered catalog identifier;
- bounded Scryfall/MTG evidence attributes.

It must not prefill or mutate:

- exact physical finish/variant;
- condition;
- grade;
- purchase price;
- market value;
- provenance;
- ownership transfer;
- Marketplace state.

## Large-volume future path

Scryfall explicitly recommends bulk data when applications need many simple lookups. The current milestone intentionally uses bounded exact live lookups because the collector is resolving individual Intake items. If future Kingdom migration/indexing needs high-volume MTG enrichment, it should use Scryfall bulk data with a locally indexed snapshot rather than iterating the live API.

## Acceptance criteria

- exact UUID validation before outbound lookup;
- exact set-code + collector-number validation before outbound lookup;
- HTTPS outside local tests;
- meaningful User-Agent and explicit Accept header;
- conservative serialized traffic below the published request ceiling;
- no automatic retry through 429;
- timeout, response-size, JSON-shape, 404, 429, and 5xx behavior;
- returned printing identifiers must match the requested evidence key;
- normalized candidate excludes prices, commerce/store links, and images;
- printing ID and Oracle ID remain distinct evidence concepts;
- finishes are possibilities, not selected physical finish;
- Royal Intake capture/validation/duplicate-review semantics;
- responsive candidate review and new-unsaved-editor prefill;
- no automatic Vault mutation or valuation;
- provider/domain/runtime/Intake/UI regression tests;
- production type/artifact checks include Pokémon and Scryfall provider modules;
- full Kingdom quality gates before merge.
