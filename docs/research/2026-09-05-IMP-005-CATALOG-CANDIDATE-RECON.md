# IMP-005 Catalog Candidate Resolution Recon — 2026-09-05

## Purpose

This research supports the first external catalog-candidate slice for the Royal Intake Queue. The objective is to improve collector intake speed without allowing an external provider, barcode, or AI suggestion to become an authoritative treasure identity automatically.

## Sources reviewed

### Open Library API guidance

Source: https://openlibrary.org/developers/api

Current Open Library guidance describes the APIs as appropriate for low-volume, real-time human discovery/lookup and asks API users to cache responses. It also states that Open Library is not intended to operate as a third-party high-traffic or bulk backend.

The usage guidance distinguishes request rates for identified and unidentified applications. Collector's Kingdom therefore uses a conservative request interval, supports an optional configured contact email for request identification, and does not treat Open Library as a bulk import service.

### Open Library Search API

Source: https://openlibrary.org/dev/docs/api/search

The Search API supports `search.json` queries with bounded `fields` and `limit` parameters. It can search by ISBN and return work-level metadata including title, authors, publishers, publication years, languages, edition count, and ISBNs.

The Kingdom adapter requests only the fields needed for review and caps provider results rather than downloading broad records.

### Open Library identifier ambiguity

Source: https://openlibrary.org/dev/docs/api/books

Open Library's historical API documentation notes that identifiers such as ISBNs can have ambiguous/reused data in real-world publishing records. Even when a provider responds to an exact ISBN query, Collector's Kingdom therefore treats the result as **candidate evidence**, not proof of an exact edition/variant.

## Architectural decisions

### 1. Provider-neutral Kingdom contract

Permanent treasure IDs remain Collector's Kingdom UUIDs. External IDs are evidence and discovery references only.

The catalog service returns normalized candidates with:

- provider ID and provider display name;
- provider record ID;
- retrieval time;
- source/evidence URL;
- evidence strength;
- a human-readable match reason;
- normalized candidate fields;
- external identifiers;
- an explicit `reviewRequired` flag.

The provider adapter does not own Vault records.

### 2. Review-only lookup

Catalog lookup performs no Vault mutation. The service response explicitly reports:

- `lookupMode: review-only`;
- `mutationPerformed: false`.

The collector may copy a candidate into an **unsaved** treasure editor. The collector must still review and save the record explicitly.

### 3. First provider scope: ISBN only

The first provider adapter supports ISBN-10/ISBN-13 only.

Reasons:

- Open Library offers a real public book-discovery API suitable for low-volume human lookup;
- ISBN has a defined validation/checksum model;
- the evidence can be represented honestly;
- it avoids pretending one book provider solves UPC/EAN, trading cards, comics, games, coins, toys, or other collectible domains.

UPC/EAN/comic/card/game/catalog providers require separate API, licensing, credential, rate-limit, and evidence-quality research before implementation.

### 4. ISBN validation before network access

The provider normalizes spaces/hyphens and performs ISBN-10 or ISBN-13 checksum validation before an outbound request. Invalid identifiers fail locally and never consume provider capacity.

### 5. Bounded external requests

The adapter includes:

- HTTPS-only external provider URL outside local testing;
- an outbound timeout;
- AbortController cancellation;
- conservative request serialization/throttling;
- bounded response-size checks using both announced and actual size;
- malformed JSON/payload rejection;
- bounded result count;
- explicit retryable/non-retryable provider error states.

### 6. Caching

A bounded in-process cache reduces repeated public lookup traffic. Current defaults:

- six-hour TTL;
- 500 entries;
- least-recently-used-style eviction behavior.

The cache is intentionally provider-result caching, not authoritative Vault persistence. Cache loss on process restart does not affect collector records.

### 7. Request identification and rate awareness

The adapter sends a Collector's Kingdom User-Agent. A contact email may be supplied through runtime configuration but is not invented or hard-coded.

The default request spacing remains conservative even when a contact is configured. This keeps the first slice appropriate for human review rather than bulk provider extraction.

### 8. No browser provider authority

The browser calls Collector's Kingdom `/api/catalog/candidates`. The server owns the provider call, timeout, cache, normalization, and policy. Provider configuration never belongs in browser code.

### 9. No valuation claims

Catalog metadata is not market value evidence. This implementation does not populate current value, trade value, price history, or investment performance.

## Implemented first-slice behavior

The current implementation adds:

- `packages/catalog/src/cache.mjs`;
- `packages/catalog/src/open-library-provider.mjs`;
- `packages/catalog/src/service.mjs`;
- authenticated `/api/catalog/candidates` HTTP boundary;
- runtime configuration for provider URL, timeout, cache limits, request interval, and optional contact;
- ISBN review controls on pending Royal Intake Queue items;
- source-evidence links;
- review-only prefill into a new unsaved Book editor;
- tests that mock provider responses so CI does not depend on public network availability.

## Verification requirements before claiming this slice live

The slice must pass the repository's full quality gate with:

- syntax/anti-fake policy;
- module contracts;
- ISBN checksum tests;
- provider normalization tests;
- no-match tests;
- malformed/oversized provider-response tests;
- cache behavior tests;
- provider outage tests;
- authenticated HTTP tests;
- explicit no-Vault-write proof;
- production build and artifact verification;
- production dependency audit.

Until that complete gate passes, this research file documents the design but does not by itself make catalog resolution a verified production capability.
