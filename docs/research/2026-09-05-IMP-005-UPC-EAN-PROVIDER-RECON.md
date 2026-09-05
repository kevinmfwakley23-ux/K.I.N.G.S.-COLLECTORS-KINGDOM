# IMP-005 UPC/EAN Candidate Provider Recon — 2026-09-05

## Purpose

This research supports the first external retail-barcode candidate provider for the Royal Intake Queue. The objective is to turn UPC/EAN/GTIN observations into reviewable product metadata evidence without allowing a third-party database, barcode, merchant listing, or price field to become authoritative Vault truth.

## Primary provider reviewed — UPCitemdb

### Official API / plan documentation

Sources:

- https://www.upcitemdb.com/wp/docs/main/development/plan/
- https://www.upcitemdb.com/wp/docs/main/development/api-rate-limits/
- https://www.upcitemdb.com/wp/docs/main/development/getting-started/
- https://www.upcitemdb.com/wp/docs/main/development/responses/
- https://upcitemdb.com/api

Current documented free-plan behavior:

- no signup required;
- full database lookup access;
- free lookup endpoint: `https://api.upcitemdb.com/prod/trial/lookup`;
- paid lookup endpoint: `https://api.upcitemdb.com/prod/v1/lookup`;
- paid requests use `user_key` and `key_type` headers;
- 100 combined free requests per day;
- free lookup burst limit of 6 requests per minute;
- documented sustainable free rate of 1 request per 10 seconds;
- free batch lookup supports up to 2 codes per request;
- rate state is communicated through `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`;
- HTTP 429 can represent daily-limit exhaustion or burst-limit / `TOO_FAST` behavior;
- retrying too aggressively after a burst-limit response can extend the blocked period.

### Response data

UPCitemdb lookup responses may include product-level metadata such as:

- UPC / EAN / GTIN;
- title;
- description;
- brand;
- model;
- color;
- size;
- category;
- images;
- prices;
- merchant offers.

### Data and redistribution caution

UPCitemdb documentation explains that some merchant sales information visible on its website is not redistributable through the API because of affiliate/network agreements. Its terms and API documentation also disclaim result accuracy.

Collector's Kingdom therefore treats UPCitemdb as a **candidate evidence source only**. This identification slice deliberately discards pricing and merchant-offer data even if the provider returns it. Those fields are not valuation evidence and must not be surfaced as Kingdom market value.

## Kingdom engineering decisions

### 1. Preserve the verified provider-neutral catalog contract

The new adapter must implement the same provider interface already used by Open Library:

- `supports(identifierType)`;
- optional `normalizeIdentifier(identifierType, identifierValue)`;
- `lookup({ identifierType, identifierValue })`;
- normalized provider/candidate results;
- `reviewRequired: true`;
- source/provider evidence;
- no Vault mutation.

Permanent treasure UUIDs remain Kingdom-owned and provider-independent.

### 2. Supported identifiers

The adapter will support:

- `upc`;
- `ean`;
- `barcode` only when the observed barcode is a numeric GS1-style code with a recognized length and valid modulo-10 check digit.

Arbitrary Code 128, QR, serial, catalog, custom, and other scanner content must **not** be sent to UPCitemdb merely because it came from a barcode scanner.

### 3. Local GS1 validation before provider use

Numeric retail identifiers should be normalized locally by removing spaces/hyphens and validating:

- EAN-8 — 8 digits;
- UPC-A / GTIN-12 — 12 digits;
- EAN-13 / GTIN-13 — 13 digits;
- GTIN-14 — 14 digits;
- standard GS1 modulo-10 check digit.

Invalid checksums fail before outbound provider traffic.

### 4. Free-tier request safety

Default free-provider spacing will be **10,000 ms** between outbound calls, matching the documented sustainable free rate.

The adapter must:

- serialize requests;
- never auto-retry 429 responses in a loop;
- inspect rate-limit headers;
- expose rate-limit/reset evidence through provider errors;
- cache successful/no-match evidence to avoid wasting the shared per-IP quota;
- keep all requests server-side.

The no-signup free plan is suitable only for low-volume human review. It is not a scalable bulk-intake backend and must not be used for automatic background enrichment of entire collections.

### 5. Optional paid configuration

If a future deployment supplies UPCitemdb paid credentials, they must be runtime/server-only configuration and never appear in browser code or repository commits.

A provider adapter may select the paid endpoint only when a user key is configured. The first implementation must not invent credentials or imply that a paid plan exists.

### 6. Bounded provider responses

Use the same external-provider hardening established by the Open Library adapter:

- HTTPS-only external transport outside local testing;
- bounded timeout;
- AbortController;
- bounded announced and actual response bytes;
- JSON structure validation;
- bounded candidate count;
- explicit provider-unavailable / malformed / rate-limited states.

### 7. Metadata allowlist

The first UPC/EAN identification slice may normalize only product-identification metadata such as:

- title;
- brand/manufacturer;
- description;
- model;
- color;
- size;
- provider category;
- UPC/EAN/GTIN identifiers;
- provider/source reference.

Explicitly exclude from normalized candidate output:

- merchant offers;
- seller links;
- prices;
- lowest/highest/current price calculations;
- inferred market value;
- images until image-origin/licensing/cache behavior receives a separate review.

### 8. Browser behavior

Only supported pending Intake Queue records should receive an external candidate action:

- UPC;
- EAN;
- numeric checksum-valid retail barcode.

The browser should show provider/source/match reason and copy a selected candidate only into a **new unsaved treasure editor**. The queue item remains pending and no authoritative record is changed until the collector explicitly saves.

## Scalability limitation

The free plan's 100-request/day and per-IP limits make it unsuitable for automatic collection-wide enrichment. The architecture must remain provider-neutral so deployments can later add paid/licensed providers without changing the authoritative Vault domain.

## Verification requirements before claiming UPC/EAN candidates live

The provider slice must pass:

- local GS1 checksum tests;
- supported/unsupported identifier tests;
- free vs configured-paid endpoint/header tests;
- throttling tests using injected clocks/sleep hooks;
- rate-limit header and 429 error tests;
- no-match tests;
- malformed/oversized provider response tests;
- normalized metadata allowlist tests proving prices/offers are excluded;
- shared catalog-service cache behavior;
- authenticated HTTP path through the existing catalog endpoint;
- review-only Intake Queue UI behavior;
- production module/artifact verification;
- complete repository quality gates and dependency audit.

Until those gates pass, UPC/EAN external candidate resolution remains under construction and must not be described as live.
