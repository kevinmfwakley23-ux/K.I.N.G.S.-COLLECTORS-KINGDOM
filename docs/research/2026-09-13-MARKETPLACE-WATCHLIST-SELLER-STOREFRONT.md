# Marketplace Watchlist + Seller Storefront Research — 2026-09-13

## Scope

Research for the next Kingdom Street Market production slice: private buyer watchlists and optional public seller storefronts, without manufacturing checkout, transaction completion, delivery proof, identity verification, or seller reputation.

## Current marketplace patterns reviewed

### eBay

- eBay describes Watchlist as a way to keep an eye on an item while the buyer decides; adding an item creates no obligation to buy it.
- eBay keeps active and ended watched listings visible as separate states rather than treating a watch as a purchase.
- eBay also separates saved searches, saved sellers, purchase history, and seller feedback into distinct buyer capabilities.

Kingdom adoption:
- Watchlist is private buyer intent only.
- Watching creates no purchase commitment, reservation, ownership change, or checkout state.
- A withdrawn/unsupported offer stays only as an unavailable private tombstone until the collector removes it.
- No watchlist notification claim is made until a real notification delivery service exists.

### TCGplayer

- TCGplayer upgraded seller pages in 2026 with dedicated seller URLs, seller inventory direction, rating history, and verified-purchase messaging.
- TCGplayer feedback is order/transaction based. Buyers leave feedback for purchases, and seller reputation is derived from actual transaction history.
- TCGplayer's Verified/Gold Star seller concepts depend on established selling history and feedback thresholds rather than self-assertion.

Kingdom adoption:
- Seller storefront URLs are stable and seller-selected.
- Storefront name and bio are explicitly seller-controlled public information, not identity verification.
- A storefront stays private until the seller explicitly publishes it.
- Public inventory is recomputed from currently supported active Marketplace listings and live Vault quantity rather than copied into a separate seller catalog.
- No star rating, sales count, verified-seller badge, or verified-purchase feedback is shown until the Kingdom has authoritative completed-transaction and delivery evidence.

### Whatnot

- Whatnot permits seller ratings/reviews after an order is marked delivered.
- Ratings therefore sit downstream of real order and delivery state, not merely listing publication.

Kingdom adoption:
- Reputation remains structurally unavailable in this phase.
- Future seller ratings must be linked to real Kingdom transaction/delivery evidence and must not be creatable from a listing, watch, or seller profile alone.

## Kingdom design decisions

1. **Private watchlist** — owner-scoped, idempotent, bounded, no purchase commitment.
2. **Unavailable tombstones** — withdrawn/unsupported offers do not leak their old public representation back through a watchlist.
3. **Explicit storefront publication** — creating/editing a storefront does not make it public until the seller opts in.
4. **Stable public ID** — public storefront IDs are validated, reserved-route safe, case-insensitively unique, and immutable after creation.
5. **Data minimization** — public storefronts do not expose account IDs, email, Vault treasure IDs, purchase cost, storage data, private collection data, or private watchlists.
6. **Live inventory** — storefront inventory uses the same active Marketplace + live Vault support boundary as public discovery.
7. **No invented reputation** — identity verification, verified-purchase feedback, rating score, sales history, checkout, payment, buyer protection, settlement, and ownership transfer remain unavailable until their real evidence-producing systems exist.
8. **Stable URL compatibility** — canonical storefront links use `/marketplace-storefront.html?store=<public-id>`; the earlier seller-page URL remains a compatibility alias to the same API-backed storefront workflow.

## Next prerequisites before reputation

A trustworthy reputation layer requires, at minimum: real order identity, buyer/seller linkage, payment/settlement state, shipment/delivery evidence, cancellation/refund/dispute state, anti-self-review controls, append-only feedback provenance, and moderation/correction rules. None of those are inferred from listing or watchlist state.
