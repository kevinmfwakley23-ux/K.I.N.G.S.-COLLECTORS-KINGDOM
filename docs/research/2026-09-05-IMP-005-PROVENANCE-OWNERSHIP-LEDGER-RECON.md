# IMP-005 Research — Provenance, Acquisition & Ownership Ledger

**Date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Purpose:** identify the next collector-first Vault capability after verified ISBN/UPC/EAN candidate resolution.

## Sources reviewed

Collector products:

- PriceCharting Collection Tracker: https://www.pricecharting.com/page/collection-tracker
- PriceCharting 2026 sold-history announcement: https://blog.pricecharting.com/2026/03/
- iCollect Everything 2026 account/collection field update: https://www.icollecteverything.com/2026/02/23/the-icollect-everything-website-has-been-completely-rebuilt/
- iCollect Everything support/export guidance: https://www.icollecteverything.com/support/

Collection-management standards and provenance guidance:

- Collections Trust Spectrum overview: https://collectionstrust.org.uk/spectrum/
- Spectrum acquisition and accessioning standard: https://collectionstrust.org.uk/resource/acquisition-and-accessioning-the-spectrum-standard/
- Spectrum provenance procedures: https://collectionstrust.org.uk/cultural-property-advice/provenance/spectrum-procedures-relevant-to-provenance/
- Secure/tamperproof accession records: https://collectionstrust.org.uk/resource/guidance-for-secure-and-tamperproof-accession-records/

Spectrum is a museum collections-management standard, not a consumer-app specification. Its principles are being used only as engineering guidance for durable collector records; Collector's Kingdom does not claim Spectrum compliance.

## Competitive findings

### Collector apps increasingly preserve transaction history

PriceCharting currently supports:

- purchase/paid amount as the cost basis for collection items;
- sold-item history;
- sale price and sale date;
- profit based on paid versus sold price;
- historical collection value tracking.

This shows that collectors expect more than a current inventory row. They benefit from a durable lifecycle record of how an item entered, changed status within, and eventually left a collection.

### Flexible fields matter, but structured provenance should not be only custom text

iCollect Everything's 2026 update emphasizes configurable custom collections/fields and purchase-value summaries. Collector's Kingdom already has extensible custom attributes, but core ownership/provenance events should have structured first-class fields so they can later support:

- insurance reports;
- title/ownership evidence;
- Marketplace sale/transfer workflows;
- tax/cost-basis exports where appropriate;
- inheritance/legacy workflows;
- audit and fraud investigation;
- provenance-confidence review.

## Collection-management findings

Spectrum acquisition guidance emphasizes several principles that map well to serious private collecting:

- every object should retain a permanent unique identifier linked to its information;
- acquisition information should remain accessible through that identifier;
- records should capture evidence of transfer of title/ownership;
- provenance should be checked and preserved where possible;
- accession/acquisition records should be difficult to silently erase or rewrite;
- location/movement, loans, exit/disposal, damage/loss, insurance and audit are separate lifecycle concerns.

Collector's Kingdom already has permanent UUID treasure identity, archive semantics, physical locations, media evidence and audit events. The missing layer is a structured, append-oriented lifecycle/provenance ledger tied to that permanent treasure identity.

## Kingdom design direction

### Provenance events, not one mutable provenance text field

Create an owner-scoped `vault_provenance_events` ledger. Each event should have its own immutable event ID and creation timestamp and point to exactly one permanent treasure UUID.

Initial event types should cover the high-value private-collector lifecycle without pretending to be a legal title registry:

- `acquired` — purchase, gift, trade, inheritance, find, other;
- `ownership-note` — prior-owner or provenance information learned later;
- `documented` — receipt, certificate, appraisal, authenticity or supporting-document note;
- `loaned-out` / `loan-returned` — possession tracking without ownership transfer;
- `sold` — sale/disposal event with sale date and optional proceeds;
- `gifted-out` / `traded-out` — non-sale disposal/transfer;
- `lost` / `stolen` / `recovered` — custody/loss state evidence;
- `correction` — append-only correction that references a prior event rather than silently rewriting historical meaning.

The initial implementation may use a smaller validated subset and expand after tests. Event names should remain stable and versionable.

### Structured fields

Useful first-class fields:

- event ID;
- treasure ID;
- owner account ID;
- event type;
- effective date/time or date;
- counterparty/person/organization display name (optional, user-entered);
- method/source (`purchase`, `gift`, `trade`, `inheritance`, `auction`, `dealer`, `private-sale`, etc.);
- amount in integer cents + ISO-style currency where money applies;
- reference/document identifier;
- location/venue/source URL where appropriate;
- freeform note;
- created-at timestamp;
- supersedes/corrects event ID where a correction is made.

Do not store sensitive payment-card/bank credentials or silently collect unnecessary personal data about counterparties.

### Append-first history

Core provenance/lifecycle events should not be silently overwritten or hard-deleted through normal UI. Corrections should append a new event referencing the earlier event. This mirrors the existing Kingdom preference for archive/history over destructive deletion and improves evidence integrity.

### Ownership truthfulness

A user-entered seller, receipt note, certificate number or provenance statement is **collector-supplied evidence**, not independent verification. The API/UI must distinguish:

- collector-recorded fact/claim;
- external supporting document or source;
- future independently verified evidence.

The Kingdom must never label a collector-entered provenance chain as authenticated merely because it is stored in the Vault.

### Money and valuation remain separate

Purchase cost and sale proceeds are transaction facts entered by the collector. They are not current market value. Multi-currency totals must never be combined without exchange-rate evidence, matching the existing Vault statistics rule.

UPCitemdb/Open Library candidate metadata must never populate financial provenance fields.

## Recommended first implementation slice

1. SQLite `vault_provenance_events` table and indexes under the Vault database.
2. owner-scoped repository methods for append/list/get.
3. service validation for event type, effective date, optional counterparty/source/reference, amount/currency, notes and correction references.
4. no ordinary destructive delete/update endpoint; corrections append.
5. authenticated HTTP routes per treasure.
6. audit events when provenance entries are appended.
7. responsive treasure-editor/details panel for timeline entry and history.
8. export inclusion so provenance remains portable.
9. tests for owner isolation, append-only semantics, currency safety, correction linkage and archive/history survival.
10. later extension into sale/disposal state, loans, insurance and Marketplace transfer workflows only after the base ledger is verified.

## Why this is the next target

The Vault already knows **what** a treasure is, **where** it is, and can capture external candidate evidence. A provenance/ownership ledger adds **how it came into the collection and what happened to it over time**. That strengthens serious collecting, insurance readiness, future Marketplace trust, inheritance/legacy use and later valuation analysis without depending on another fragile external provider.
