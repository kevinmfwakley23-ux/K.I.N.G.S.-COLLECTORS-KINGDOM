# 2026-09-18 — Marketplace Trust, Fulfillment and Protection Benchmark

## Objective

Use current leading collectibles marketplaces and mature open-source commerce architecture to strengthen the K.I.N.G.S. Collector's Kingdom post-payment design without copying proprietary implementations or turning weak evidence into stronger claims than it supports.

## Current marketplace findings

### Whatnot — fulfillment speed, carrier scans, buyer protection and seller health

Sources:
- https://help.whatnot.com/hc/en-us/articles/43295059160973-Shipping-Policy-for-Sellers
- https://help.whatnot.com/hc/en-us/articles/360061194552-Whatnot-Buyer-Protection
- https://help.whatnot.com/hc/en-us/articles/41945906342029-Improve-your-Seller-Performance-metrics
- https://trust.whatnot.com/seller-protection

Useful patterns:
- shipment performance is tied to real carrier/dropoff scans rather than only a seller clicking "shipped";
- buyer protection is organized around concrete post-purchase failure classes such as non-arrival, damage and not-as-described;
- seller health distinguishes shipping performance, defects and issue resolution;
- shipping protection / claims are separate workflows rather than an automatic consequence of a payment event.

Kingdom implication: seller-entered tracking must remain explicitly seller-declared until a carrier/provider verifies it. Future seller-health metrics must be derived from verified evidence, not self-attestation.

### TCGplayer — transaction-price integrity, tracked-order protection and verified-purchase feedback

Sources:
- https://help.tcgplayer.com/hc/en-us/articles/201637633-TCGplayer-Safeguard
- https://help.tcgplayer.com/hc/en-us/articles/24768427937943-Seller-Guide-to-Refunds-and-Returns
- https://help.tcgplayer.com/hc/en-us/articles/34838289723927-Leaving-feedback-for-sellers
- https://seller.tcgplayer.com/blog/introducing-the-upgraded-seller-feedback-page

Useful patterns:
- refund logic preserves the original transaction price rather than silently substituting later market value;
- seller protections depend on shipment evidence and tracking requirements;
- public seller feedback is tied to verified purchases;
- order issues are expected to be resolved through transaction-linked support context.

Kingdom implication: future refunds, claims and ratings must bind to authoritative order IDs and payment evidence. Collection valuation remains separate from refund amount authority.

### eBay — handling-time evidence, tracking, signature and fair seller-performance measurement

Sources:
- https://www.ebay.com/help/selling/selling/monitor-improve-seller-performance?id=4785
- https://www.ebay.com/help/policies/selling-policies/seller-standards-policy?id=4347
- https://www.ebay.com/help/policies/listing-policies/shipping-policy?id=5035
- https://www.ebay.com/help/policies/selling-policies/seller-performance-policy?id=4345

Useful patterns:
- fulfillment performance distinguishes seller handling time from carrier delivery;
- integrated carrier scans can protect sellers from downstream carrier delays;
- high-value shipment rules may require stronger delivery evidence such as signature confirmation;
- seller metrics need enough evidence and volume to avoid unfair conclusions.

Kingdom implication: future carrier verification, handling-time measurement and seller health must preserve source authority and sample-size context. No high-value protection claim should exist before a real carrier/shipping policy integration exists.

## Open-source architecture findings

### Medusa

Sources:
- https://docs.medusajs.com/resources/commerce-modules/order
- https://docs.medusajs.com/resources/commerce-modules/order/return

Useful pattern: returns, claims, exchanges and order edits are separate workflow/data boundaries with rollback-aware orchestration rather than mutations hidden inside a generic order object.

### Spree / Saleor

Sources:
- https://github.com/spree/spree
- https://github.com/saleor/saleor
- https://github.com/saleor/apps

Useful pattern: marketplace seller, order, fulfillment, payout, tax and integration concerns remain modular. External services communicate through explicit APIs/webhooks rather than being treated as database truth automatically.

Kingdom implication: keep payment, fulfillment, carrier verification, buyer protection, returns, feedback and ownership-transfer authorization as separate authorities connected through append-only evidence.

## Phase 2.1 implementation decisions

1. **Production transaction core stays authoritative.** This work is layered on top of the already verified reservation-recovery, Stripe Connect policy and signed-webhook transaction baseline; it does not replace those files with the older draft versions.
2. **Seller-declared shipment is not carrier proof.** Carrier and tracking entry remain `seller-declared`; `carrierVerified` and `deliveryVerified` stay false.
3. **Immutable shipment evidence digest.** Each shipment request receives a SHA-256 digest over order ID, quantity and declared tracking/no-tracking evidence. The digest is exposed to the authenticated buyer/seller as an audit handle.
4. **Append-only evidence timeline.** Private order-detail reads expose the persisted shipment-event timeline; events are not rewritten into stronger claims.
5. **Paid-state gate.** New shipment evidence is accepted only while provider-authoritative order state is `paid`.
6. **Atomic quantity authority.** Partial shipments are supported, but persisted shipment quantity can never exceed the paid order quantity.
7. **Explicit untracked path.** No-tracking shipment evidence requires one bounded reason rather than silently leaving tracking blank.
8. **Local pickup stays separate.** Pickup cannot masquerade as shipment evidence.
9. **Buyer/seller privacy.** Shipment evidence is private to the authenticated transaction parties.
10. **No automatic provenance or ownership transfer.** Payment, shipment and even future delivery evidence remain insufficient by themselves to mutate authoritative Royal Vault ownership.
11. **No invented shipping protection.** Shipping insurance/protection, labels, carrier scans, delivery, signature confirmation and buyer-protection decisions remain unavailable until separately integrated and verified.
12. **UI truth mirrors service truth.** Orders & Payments shows evidence SHA-256, seller-declared authority and append-only timeline while clearly labeling unavailable verification layers.

## Next competitive trust target

After Phase 2.1 is green and merged, the next Marketplace trust slice should be an evidence-backed **Buyer Issue / Resolution Center**:

- order-linked issue cases for non-arrival, damage, not-as-described and suspected authenticity problems;
- buyer/seller messages and photo/document evidence;
- immutable case timeline and escalation state;
- refund/return authority tied to authoritative payment amounts rather than market estimates;
- carrier evidence ingestion before seller-performance conclusions;
- verified-purchase feedback only after an eligible transaction lifecycle state;
- seller-health metrics only from sufficiently supported order/carrier/case evidence.

The Kingdom should outperform competitors through **stronger evidence provenance and clearer authority boundaries**, not by pretending unsupported automation is finished.
