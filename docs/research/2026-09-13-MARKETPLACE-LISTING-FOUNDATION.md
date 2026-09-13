# Kingdom Street Market — Listing Foundation Research

**Date:** 2026-09-13  
**Scope:** first production Marketplace slice: Vault-linked seller listing publication and public discovery.  
**Branch:** `marketplace/foundation-listings`

## Product authority

The K.I.N.G.S. Collector's Kingdom mission requires the Marketplace to live outside the castle as the Kingdom Street Market and specifically calls for a verified Vault item to become a listing without repeated data entry while preserving collector approval and transaction safeguards.

This slice follows that authority. It does not introduce payment, checkout, settlement, shipping protection, disputes, tax handling, seller KYC, or ownership transfer before those systems have their own researched and verified trust boundaries.

## Current official research reviewed

### eBay Inventory API

Official documentation:

- https://developer.ebay.com/develop/api/sell/inventory_api
- https://developer.ebay.com/api-docs/sell/inventory/static/overview.html

Useful architecture lesson: eBay separates an inventory item from an offer that can later become a live marketplace listing. Product/inventory facts, location/quantity, pricing and offer publication are distinct concepts rather than one mutable mystery record.

Kingdom-native adaptation:

- the Royal Vault remains the physical-item authority;
- a Marketplace listing references the permanent Vault treasure UUID rather than replacing it;
- a seller creates a private draft first;
- publication is a separate explicit action;
- the public representation is frozen and SHA-256 addressed when published;
- later private Vault edits do not silently rewrite what the seller represented to the public.

No eBay source code or proprietary UI was copied. This foundation does not cross-post to eBay.

### TCGplayer Marketplace Seller Agreement

Official documentation:

- https://help.tcgplayer.com/hc/en-us/articles/201307587-Marketplace-Seller-Agreement

Relevant trust lessons from the current agreement include seller responsibility for lawful eligibility, the right to sell the item, physical possession, accurate listing descriptions, correct listing placement, and fulfillment responsibilities. TCGplayer also prohibits drop-shipping items a seller does not physically possess.

Kingdom-native adaptation in this slice:

- only the authenticated owner of an active Vault treasure can draft its listing;
- offered quantity cannot exceed the current Vault quantity;
- quantity is revalidated immediately before publication;
- publication requires explicit possession, right-to-sell, and accuracy attestations;
- one physical Vault treasure cannot have multiple simultaneous open Kingdom listings;
- the Kingdom does not infer authenticity, legality, or professional verification merely from a seller attestation.

### Whatnot Buyer Protection and Trust Center

Official documentation:

- https://trust.whatnot.com/buyer-protection
- https://trust.whatnot.com/
- https://help.whatnot.com/hc/en-us/articles/360061194552-Whatnot-Buyer-Protection

Current trust lessons include clear pre-purchase representation, seller verification, protection for non-arrival/damage/not-as-described cases, and visible trust/safety processes.

Kingdom-native adaptation in this slice:

- the exact published offer representation receives an immutable SHA-256 digest;
- public browse receives only a sanitized representation rather than private owner/Vault fields;
- public and seller responses explicitly state that buyer protection, checkout, payment, shipment tracking, disputes and settlement are **not yet available**;
- a published offer cannot be edited in place; the seller must withdraw it before creating a replacement listing, preserving what was actually represented.

The protection/dispute system itself is intentionally not simulated. It belongs in a later transaction milestone with payment/order evidence and operational support rules.

## First-slice domain decisions

### Listing authority

The Marketplace owns offer publication state. The Vault owns physical treasure identity, current owner scope, quantity and private collection data. Publishing never transfers ownership or archives the Vault treasure.

### State model

The initial state machine is intentionally small:

`draft -> active -> withdrawn`

and

`draft -> withdrawn`

Only fixed-price offers are supported. Auctions, offers/counteroffers, trades, reservations and bundles are not represented as live capabilities yet.

### Public privacy boundary

Public active listing responses contain the frozen offer representation, publication time and representation digest. They do not expose:

- seller account IDs;
- permanent Vault treasure IDs;
- acquisition cost;
- private owner notes;
- physical storage location;
- private provenance records;
- private documents/media merely because a listing exists.

Marketplace-specific seller profiles and intentionally public listing media can be added through later reviewed boundaries.

### Evidence and tamper behavior

At publication the Kingdom stores the exact representation JSON and its SHA-256 digest. Reads fail closed with `marketplace_representation_integrity_failure` if the stored representation no longer matches its digest.

The listing-event ledger is append-only for draft creation, draft updates, publication and withdrawal. Withdrawal records that ownership was not transferred.

### Transaction truth boundary

This phase does **not** claim:

- buyer checkout;
- payment authorization/capture;
- escrow or settlement;
- seller payout;
- taxes;
- shipping labels or tracking;
- buyer protection;
- return/dispute handling;
- seller identity/KYC approval;
- completed orders;
- automatic provenance `sold` events;
- Marketplace-driven Vault ownership transfer.

Those systems must be designed together so the Kingdom never records a sale merely because someone clicked a decorative button or an external payment failed halfway through.

## Competitive improvement goal

The immediate advantage is not "more commerce buttons." It is a stronger evidence boundary between what the collector owns, what the seller represented, and what the public can inspect. The listing can be traced back privately to a real Vault item while the public representation remains sanitized and tamper-evident.

The next Marketplace research/build phase should cover seller eligibility/KYC policy, order state machines, payment-provider architecture, idempotency, payment/settlement webhooks, shipping evidence, buyer protection/disputes, fraud controls, tax responsibilities, cancellation/refund rules and atomic ownership/provenance transfer after a completed safeguarded transaction.
