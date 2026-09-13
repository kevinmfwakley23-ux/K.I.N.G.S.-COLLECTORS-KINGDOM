# K.I.N.G.S. Collector's Kingdom — Marketplace Progress

This file is the parallel recovery ledger for the Kingdom Street Market workstream. It exists so Marketplace work can proceed without editing the shared `docs/MISSION-PROGRESS.md` while another co-chief engineer is actively completing the Royal Vault Phase 1 workstream.

## Coordination boundary

**Date:** 2026-09-13 (America/Denver)  
**Branch:** `marketplace/foundation-listings`  
**Pull request:** #31 — `Marketplace: Vault-linked listing foundation`  
**Base production commit:** `dc9d5a3b180df6fa5c04c115a53a5b105b48b8a4` (PR #30 merged)  
**Concurrent co-chief work:** PR #32 — Royal Vault Year/Tags metadata  
**File-overlap audit:** PR #32 changes Vault metadata/query/import/UI files only; PR #31 does not modify those files.

The Marketplace workstream intentionally does not edit the shared core `apps/web/server.mjs`, the Vault schema/store file, or PR #32's Year/Tags implementation. Marketplace persistence creates its own tables through a Marketplace repository using the existing Vault SQLite connection.

## Current verified checkpoint

**Marketplace hardened implementation head:** `2bd2fee8e332cdee089cc04d2467cdcd245a52e4`  
**Kingdom Quality Gates:** #698 — **PASS**

The #698 gate ran the repository's canonical `npm run verify` chain: lint, type-contract verification, the complete Node test suite including the Marketplace service/HTTP/integrity/Vault-support/UI tests, production build, and production artifact verification. The production dependency audit remains part of the GitHub workflow.

## Implemented in this slice

### Marketplace domain and persistence

- `packages/marketplace/src/repository.mjs`
- `packages/marketplace/src/service.mjs`

Production behavior:

- owner-scoped Vault treasure is required before a listing draft can exist;
- fixed-price is the only live sale format in this slice;
- seller price uses integer minor currency units and explicit three-letter currency;
- seller-selected quantity cannot exceed current Vault quantity;
- only one open draft/active listing can exist for the same permanent Vault treasure UUID;
- draft creation is private;
- publishing requires explicit seller confirmations for physical possession, right to sell, and representation accuracy;
- quantity is revalidated immediately before publication;
- publication creates a frozen JSON representation and SHA-256 digest;
- active offers cannot be edited in place;
- withdrawal is append-only Marketplace history and explicitly does not transfer ownership;
- public active-listing queries join back to the current Vault state and suppress offers whose treasure is archived or whose current quantity no longer covers the offered quantity;
- public responses never expose seller account ID, permanent Vault treasure ID, acquisition cost, private owner notes, or storage location;
- stored published representation integrity is verified on read and fails closed if its SHA-256 does not match.

### Production HTTP/runtime integration

- `apps/web/marketplace-http.mjs`
- `apps/web/marketplace-server.mjs`
- `apps/web/runtime.mjs`

The production runtime constructs the Marketplace repository/service and uses a Marketplace-aware wrapper around the existing verified Kingdom server. Only `/api/marketplace/*` is intercepted; all existing auth, Vault, grading, catalog, Keeper, health and static routes continue through the original server handler.

Marketplace API responses are `no-store` so a withdrawal or unsupported Vault quantity is not obscured by a short public cache.

Live Marketplace routes include:

- `GET /api/marketplace/listings` — public sanitized active offers;
- `GET /api/marketplace/listings/:id` — one public active offer;
- `POST /api/marketplace/listings` — authenticated private draft creation;
- `PATCH /api/marketplace/listings/:id` — authenticated draft-only editing;
- `POST /api/marketplace/listings/:id/publish` — authenticated attested publication;
- `POST /api/marketplace/listings/:id/withdraw` — authenticated withdrawal;
- `GET /api/marketplace/my-listings` — authenticated seller view;
- `GET /api/marketplace/my-listings/:id` — authenticated seller detail with append-only listing events.

### Great Hall / Keeper integration

- `packages/marketplace/src/great-hall-adapter.mjs`

The adapter marks the outdoor Kingdom Street Market available, links it to `/marketplace.html`, adds a Great Hall quick action and real public-listing highlights, and amends Keeper context with current Marketplace availability while preserving the core Great Hall implementation unchanged.

### Collector-facing Street Market

- `apps/web/public/marketplace.html`
- `apps/web/public/marketplace.js`
- `apps/web/public/marketplace.css`

The live page provides:

- public active-offer discovery;
- publication hash visibility;
- signed-in My Stall workflow;
- active Vault treasure selection;
- private draft creation;
- price/currency/quantity/fulfillment/description entry;
- three explicit publish attestations;
- publishing and withdrawal;
- mobile layout, keyboard focus visibility and reduced-motion handling;
- direct language stating that checkout/payment/settlement/buyer protection/ownership transfer are not yet live.

No fake Buy, Checkout or Pay control is presented.

## Research record

`docs/research/2026-09-13-MARKETPLACE-LISTING-FOUNDATION.md`

Current official research reviewed:

- eBay Inventory API — inventory item and offer separation;
- TCGplayer Marketplace Seller Agreement — physical possession/right-to-sell/accurate-description obligations;
- Whatnot Trust Center and Buyer Protection — representation transparency, seller verification and post-purchase protection patterns.

No competitor source code or proprietary UI was copied.

## Verification coverage

- `tests/marketplace.test.mjs` — owner scope, duplicate prevention, quantity validation, attestations, immutable/sanitized representation, withdrawal and ownership non-transfer;
- `tests/marketplace-integrity.test.mjs` — direct SQLite tamper detection/fail-closed read;
- `tests/marketplace-vault-support.test.mjs` — stale quantity/archive suppression from public discovery;
- `tests/marketplace-server.test.mjs` — real account/auth + Vault + Marketplace HTTP path through the production wrapper;
- `tests/marketplace-ui.test.mjs` — live Street Market artifact/accessibility/truth-boundary contract;
- `tools/typecheck.mjs` — Marketplace module contracts required;
- `tools/verify-build.mjs` — Marketplace server/domain/UI files required in `dist`.

## Intentionally unfinished

Do not describe the following as available:

- checkout or carts;
- payment authorization/capture;
- escrow or settlement;
- seller payouts;
- seller identity/KYC approval;
- tax calculation/reporting;
- order lifecycle;
- shipping labels/tracking;
- buyer protection;
- returns, refunds or disputes;
- fraud/risk scoring;
- offers/counteroffers;
- auctions;
- trades;
- bundles;
- public seller profiles/reputation;
- Marketplace-specific public media publishing;
- automatic `sold` provenance events;
- Marketplace-driven Vault ownership transfer;
- external marketplace cross-posting.

## Next Marketplace target

After this listing foundation is integrated against the latest `main`, research and design the **Safeguarded Transaction Foundation** before writing checkout code. The design must cover seller eligibility/KYC boundaries, order state machine and idempotency, payment-provider/webhook authority, taxes, shipment evidence, cancellation/refund rules, disputes/buyer protection, fraud controls, atomic settlement, and the exact condition under which a completed transaction may append provenance and transfer authoritative Vault ownership.

The guiding rule is: a Marketplace click is never a sale. Ownership changes only after an independently verified transaction state authorizes it.
