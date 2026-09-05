# Competitive Reconnaissance — IMP-004 Great Hall & Navigation

Date: 2026-09-04
Status: Research completed before continuing IMP-004 implementation

## Authority used

This reconnaissance is subordinate to the locked K.I.N.G.S. Collector's Kingdom Construction Documents.

Construction-document requirements reviewed before implementation:

- PRD-001 — The Great Hall
- PRD-002 — The Vault
- PRD-008 — Marketplace District
- PRD-011 — The Keeper Framework
- ENG-002 — Frontend Architecture Standards
- ENG-003 — Backend Service Architecture Standards
- IMP-004 — Great Hall & Navigation Implementation
- IMP-005 — Vault (Phase 1) Implementation

Important locked conclusions:

- Great Hall establishes the visual identity, navigation philosophy, collector welcome, summaries, search entry, and The Keeper's home presence.
- The Keeper is not a standalone chatbot; he is one continuous relationship throughout the Kingdom and adapts roles by location.
- The Vault is the authoritative permanent home of owned collectibles and must support secure organization, search, multiple views, storage location, history, media, export, auditability, and future Marketplace integration.
- The Marketplace is explicitly a Marketplace District. The user's approved world design places that district outside the castle as the Kingdom Street Market.
- IMP-004 must not pretend IMP-005 Vault services or later Marketplace services are already operational.

## Current commercial/app research

### Collectr

Source: Google Play — https://play.google.com/store/apps/details?id=com.collectrinc.collectr

Observed strengths:

- multi-TCG portfolio tracking
- raw, graded, and sealed product support
- current portfolio value and market trends
- biggest gains/losses
- multi-currency views
- saved trade analysis
- grade comparison
- camera scanning improvements

Kingdom opportunity:

- preserve broad category support beyond TCG-only collections
- add evidence/provenance around valuations rather than presenting one opaque market number
- combine trade analysis with the collector's actual Vault records, acquisition history, condition, storage, and goals
- let The Keeper explain uncertainty and alternatives without taking decision authority from the collector

### CollX

Source: Google Play — https://play.google.com/store/apps/details?id=app.collx.android

Observed strengths:

- camera recognition across sports and TCG cards
- very large catalog
- historical pricing
- condition/grade-aware pricing
- portfolio tracking
- grid/list/set views
- set-completion tracking
- marketplace buying, selling, shipping, and tracking

Kingdom opportunity:

- extend recognition beyond card-only domains
- require confidence-aware identification rather than silently accepting a weak match
- make physical storage location first-class
- connect marketplace preparation directly to verified Vault records without repeated entry
- preserve collector ownership, provenance, and legacy history throughout commerce

### CLZ

Sources:

- Google Play developer catalog — https://play.google.com/store/apps/dev?id=8606763053174586288
- CLZ Comics — https://play.google.com/store/apps/details?id=com.collectorz.javamobile.android.comics

Observed strengths:

- camera cover recognition
- barcode/ISBN/catalog-number intake across different collection domains
- strong editable metadata
- custom fields
- multiple collections
- storage-box data
- cloud synchronization
- domain-specific databases

Kingdom opportunity:

- provide one coherent cross-category Kingdom rather than separate apps per collection type
- support both authoritative category fields and collector-defined metadata
- model exact physical locations more deeply than a single storage-box field
- use The Keeper to reduce repetitive data entry while keeping edits collector-controlled

### PriceCharting

Sources:

- Collection Tracker — https://www.pricecharting.com/page/collection-tracker
- Premium feature comparison — https://www.pricecharting.com/pricecharting-pro

Observed strengths:

- broad collectible categories
- unlimited collection tracking at the base level
- historical collection values
- condition, grade, and quantity
- barcode scanning
- photos and notes
- sold-history records
- sale price/date and profit tracking
- wishlist/deal workflows
- marketplace access

Kingdom opportunity:

- combine these financial records with richer ownership/provenance, physical storage, memory, projects, insurance, legacy, and AI explanation
- track source freshness and confidence for value evidence
- separate market estimate, expected net proceeds, realized price, cost basis, and collector-entered value instead of collapsing them into one figure

## Current open-source/GitHub research

### Shelf.nu

Repository: https://github.com/Shelf-nu/shelf.nu

Useful concepts:

- hierarchical physical locations
- QR asset tags and scanner workflows
- custody tracking
- custom fields and tags
- bulk scanner actions
- audit trails
- CSV import/export
- reminders
- granular roles

Kingdom adaptation:

Use the underlying problem-solving ideas for precise physical treasure location, auditability, bulk movement, and portable data. Do not copy AGPL source into the Kingdom.

### The Tin

Repository: https://github.com/the-tin-app/the_tin

Useful concepts:

- privacy/offline-first recognition
- batch scanning with a review/staging step
- variant and condition review before final save
- collection price history
- grading ROI context
- insurance reports
- printable collection sheets
- explicit collector data ownership

Kingdom adaptation:

Adopt the review-before-commit principle for uncertain scans, insurance/documentation concepts, and strong data ownership. Improve them by supporting many collectible categories, richer provenance, physical location, and Keeper-assisted verification.

### Bindarr

Repository: https://github.com/thenotoriousJeremy/bindarr

Useful concepts:

- binder page/slot and box row/divider location models
- visual scanning
- set and bulk-add workflows
- graded copy data
- multi-language support
- export/API access
- explicit "missing rather than guessed" recognition behavior
- backup/restore discipline

Kingdom adaptation:

The most important idea is that an identification system should report uncertainty or missing catalog coverage instead of confidently assigning the wrong item. Physical-location modeling should extend beyond cards to safes, cases, shelves, rooms, bins, binders, pages, pockets, and other collector-defined locations.

## Requirements adopted or strengthened by this session

1. Navigation now explicitly models `castle` versus `grounds` so the Marketplace District cannot accidentally become an indoor castle room later.
2. The Keeper client is being made reusable and room-aware so one character follows the collector rather than each page implementing a separate chatbot.
3. The Keeper's system context now explicitly identifies him as the resident royal assistant/butler/servant/advisor/steward/curator/guide and as an upright lion in formal royal service attire.
4. The Keeper context preserves collector authority over permanent memories and cost/quality routing choices and requires verification over confident guessing.
5. The Vault entrance visually establishes a secure Royal Vault while leaving real Vault functionality for IMP-005.
6. The Marketplace entrance establishes the outdoor Kingdom Street Market while leaving real commerce for approved Marketplace phases.
7. Future Vault implementation should treat detailed physical storage location as first-class and should support high-volume scanning/intake with a review step for uncertain identification.
8. Future value systems should preserve evidence/source freshness and distinguish estimates from realized sale results.

## Ideas deliberately not adopted

- TCG-only or card-only product boundaries — incompatible with the Kingdom's general collector mission.
- Paywall-driven feature fragmentation as a design requirement — monetization must not dictate the architecture.
- Opaque market-price numbers presented as guaranteed liquidation value.
- Automatic acceptance of uncertain visual recognition.
- Marketplace urgency/manipulation patterns — prohibited by the Marketplace PRD's trust-first philosophy.
- Copying source or proprietary visual designs from competitors.

## Next implementation consequence

Finish IMP-004 against its locked Definition of Done and quality gates. Then begin IMP-005 only after IMP-004 is validated. IMP-005 should use this research to strengthen the already-approved Vault requirements without expanding or reordering the locked roadmap.
