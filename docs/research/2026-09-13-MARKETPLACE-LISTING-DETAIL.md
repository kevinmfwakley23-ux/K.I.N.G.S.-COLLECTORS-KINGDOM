# Marketplace Shareable Listing Detail Research — 2026-09-13

## Scope

Research and design rationale for stable, shareable Kingdom Street Market listing-detail pages that improve buyer understanding and seller promotion without introducing fake checkout, payment, ownership transfer, or accidental publication of private Vault media.

## Current marketplace patterns reviewed

### TCGplayer seller storefronts and individual listing links

Source: https://seller.tcgplayer.com/blog/showcase-your-business-with-seller-storefronts

TCGplayer's May 1, 2026 storefront announcement explicitly supports unique links for individual listings so sellers can promote high-demand, premium, special-offer, or overstock inventory directly. It also positions seller storefronts as a direct inventory browsing experience.

Kingdom adoption:
- Every currently supported public Marketplace listing gets a stable shareable detail URL based on the Marketplace listing ID, not the private Vault treasure ID.
- Street Market search cards and seller storefront cards lead to the same canonical detail page.
- The detail page links back to an explicitly published seller storefront when one exists.
- A withdrawn or unsupported offer is not reconstructed from an old snapshot merely because someone has an old share link.

### eBay item specifics

Source: https://www.ebay.com/sellercenter/listings/item-specifics

Current eBay Seller Center guidance describes item specifics as descriptive attributes that help buyers understand items and improve listing findability. Category-specific specifics can include brand/type and other relevant structured descriptors.

Kingdom adoption:
- The detail page gives the frozen seller-published representation enough room to show category, manufacturer, series/set, variant, condition label, sale format, fulfillment, quantity, seller description, price/currency, publication timestamp, and representation SHA-256.
- These fields come only from the already-sanitized public Marketplace representation. Private Vault ownership, acquisition cost, notes, storage, collection membership, and treasure UUID remain unavailable.

### TCGplayer listings with photos

Source: https://help.tcgplayer.com/hc/en-us/articles/360000111827-Intro-to-Listings-with-Photos-Sellers

TCGplayer supports seller-specific listing photos and notes that photos are especially useful for rare, valuable, graded, signed, or otherwise condition-sensitive products.

Kingdom improvement / deferral:
- Images would materially improve collectible listing detail pages, but existing Royal Vault media is private evidence.
- This phase does **not** auto-publish Vault images or expose the private media endpoint.
- A future Marketplace media feature must add an explicit seller public-media selection/consent boundary, a sanitized public derivative/storage path, content/type/size controls, withdrawal behavior, and tests proving non-selected Vault media remains private.

## Kingdom trust decisions

1. **One public source of truth** — detail pages call the existing public active-listing endpoint; they do not create a second listing-detail database.
2. **Live support required** — if the listing is withdrawn, its Vault treasure is archived, quantity becomes insufficient, or the active listing disappears, the share page becomes unavailable.
3. **Integrity required** — a SHA mismatch fails closed and the detail page does not display the tampered snapshot.
4. **Public ID separation** — share URLs use Marketplace listing IDs, never Vault treasure IDs.
5. **No private-field leakage** — purchase/acquisition cost, owner notes, storage/location, collection membership, account identity, and Vault treasure ID remain outside the public representation.
6. **No private media leakage** — Vault media is not automatically public just because its treasure is listed.
7. **No fake commerce** — the detail page may be watched and shared, but checkout, payment, settlement, buyer protection, shipping tracking, disputes, and ownership transfer remain explicitly unavailable.
8. **No stale resurrection** — old share links do not provide a route to republish withdrawn or integrity-failed offer details.
9. **Accessible sharing** — clipboard copying is enhancement-only; the browser address-bar URL remains the fallback.

## Follow-on opportunities

After this slice is production-verified, the next safe Marketplace intelligence layer is a Kingdom Market Observatory built from **current Kingdom asking inventory** and clearly labeled as asking-market information rather than sold comps, appraisals, or verified market value. Any price distribution must stay currency-scoped and must not silently convert unlike currencies.
