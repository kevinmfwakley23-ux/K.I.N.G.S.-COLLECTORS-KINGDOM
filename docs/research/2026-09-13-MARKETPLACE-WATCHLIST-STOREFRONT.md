# Marketplace Watchlist + Seller Storefront Research — 2026-09-13

## Scope

This research supports the next Kingdom Street Market discovery/engagement slice after private saved searches and query-bound pagination. The goal is to improve buyer return workflows and seller discoverability without pretending transaction, reputation, payment, or identity-verification systems exist.

## Current first-party market patterns reviewed

### eBay

Official eBay guidance exposes three related buyer-return primitives: Watchlist for specific active items, Saved searches for recurring queries, and Saved sellers for merchants a buyer wants to revisit. eBay also exposes seller profile/store surfaces containing seller-selected public information and active inventory.

Useful pattern: item watch intent is distinct from purchase intent. A watched item remains something the buyer is considering, not an order or contractual commitment.

Sources:
- https://www.ebay.com/help/selling/selling/ebay-profile-page?id=5185
- https://pages.ebay.com/make-the-most-of-ebay/
- https://www.ebay.com/help/selling/selling/ebay-profile-page?id=5184

### TCGplayer

TCGplayer's current Seller Storefront surfaces a seller's available Marketplace inventory together and handles the no-inventory/inactive state explicitly rather than showing stale purchasable product. Its help documentation also ties feedback to completed purchase history, which is an important boundary for the Kingdom: seller reputation must not be fabricated before a real transaction system exists.

Sources:
- https://help.tcgplayer.com/hc/en-us/articles/40238916287895-Seller-Storefront-FAQ
- https://help.tcgplayer.com/hc/en-us/articles/34838289723927-Leaving-feedback-for-sellers

### Whatnot

Whatnot exposes public profile fields such as profile picture, banner, bio, name and username. The important trust lesson is that public seller identity is an explicit public surface rather than an accidental leak of private account data.

Source:
- https://help.whatnot.com/hc/en-us/articles/7937283893005-Edit-your-Whatnot-profile

## Kingdom decisions

### 1. Watchlist is private consideration state, not commerce state

The Kingdom will add a private owner-scoped listing watchlist. Adding a listing:

- creates no reservation;
- creates no offer, order or transaction;
- transfers no ownership;
- sends no seller notification in this slice;
- promises no price-drop or availability alert;
- does not expose watcher counts publicly.

If a watched listing is withdrawn or becomes unsupported by current Vault state, the private watchlist preserves a minimal unavailable tombstone rather than resurrecting private/stale listing content.

### 2. Storefront publication must be explicit opt-in

Existing account IDs, email addresses and ordinary private identity profile data must never become Marketplace-public automatically.

A seller storefront therefore gets its own Marketplace-owned public profile boundary:

- explicit unique public slug;
- explicit seller-selected public display name;
- optional bounded bio;
- private/public publication state;
- public inventory derived only from currently supported active Marketplace listings.

Unpublishing a storefront hides the public profile without changing or withdrawing the seller's individual active listings.

### 3. No fake verification or reputation

This slice will not manufacture:

- verified-seller badges;
- KYC completion;
- feedback scores;
- transaction counts;
- follower counts;
- sales volume;
- buyer-protection claims.

Public storefront payloads will state that seller verification, feedback and transaction checkout are not available through this foundation.

### 4. Public inventory remains evidence-locked

Storefront inventory must reuse the existing sanitized `publicListing` boundary. It must not expose seller account IDs, permanent Vault treasure IDs, acquisition data, private media/storage, or any unpublished draft.

A storefront must also inherit current Vault support checks, so archived or under-quantity treasures disappear from public inventory automatically.

### 5. Improve on common marketplace coupling

The Kingdom deliberately separates:

- private account identity;
- public seller/storefront identity;
- public listing representation;
- private buyer watch intent;
- future transaction authority.

That separation keeps the next discovery feature useful now while leaving a clean future path for seller eligibility, payments, shipping, feedback and buyer protection after those systems are real.

## Acceptance direction

A production-ready slice should prove:

- watchlists are authenticated and owner-isolated;
- watched active listings resolve through the sanitized public-listing authority;
- withdrawn/unsupported watched listings become unavailable without exposing private listing data;
- storefronts are private by default and require explicit public publication;
- public slugs are unique and validated;
- public storefront responses expose no account/email/Vault identity;
- storefront inventory includes only currently supported active offers;
- public profile text is bounded and safely rendered;
- no UI or API claims alerts, checkout, payment, seller verification, reputation or ownership transfer;
- production runtime/artifact verification includes the new boundary.
