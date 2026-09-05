# Competitive Reconnaissance — IMP-005 Royal Vault Phase 1

Date: 2026-09-04
Status: Research completed before IMP-005 implementation

## Authority used

This reconnaissance is subordinate to the locked K.I.N.G.S. Collector's Kingdom Construction Documents.

Construction-document requirements reviewed before implementation:

- PRD-002 — The Vault
- PRD-011 — The Keeper Framework
- INF-002 — Kingdom Security Framework
- INF-003 — Kingdom Data & Storage Architecture
- INF-004 — Kingdom Synchronization Framework
- ENG-002 — Frontend Architecture Standards
- ENG-003 — Backend Service Architecture Standards
- IMP-005 — Vault (Phase 1) Implementation

Binding conclusions from the Construction Documents:

- The Vault is the authoritative and permanent home of every collectible the collector owns.
- The Vault must support secure organization, retrieval, search, categories/tags, media, collection statistics, duplicate detection, export, audit history, permissions, storage location, and ownership history.
- Treasure records must be designed for future grading, Marketplace listing, insurance, provenance, legacy, and other approved Kingdom systems without requiring architectural redesign.
- The Keeper serves as Royal Curator inside the Vault and may use only authorized collector information.
- Collector records must remain accurate, durable, portable, secure, and available over the long term.
- Synchronization architecture must eventually preserve offline work and multi-device continuity without hiding conflicts.
- IMP-005 must build real Vault capabilities; later Marketplace, Vision identification, grading, and synchronization systems must not be simulated early.

## Current commercial and app research

### Sortly

Source: Google Play — https://play.google.com/store/apps/details?id=com.sortly.mythings

Observed strengths:

- barcode and QR workflows
- custom folders, fields, tags, and photos
- offline inventory use and synchronization
- alerts and reporting
- import workflows
- multi-user access controls

Kingdom adaptation:

- use hierarchy as a collector-friendly physical treasure map rather than generic warehouse inventory
- keep folders and physical storage as separate concepts
- preserve offline/synchronization readiness in the data model rather than coupling Vault records to one browser session
- keep collector authorization mandatory for every record

### Collectibles.com

Source: Google Play product listing and official product materials

Observed strengths:

- AI-assisted photo identification across collectible categories
- collection management
- estimated value tracking
- collector profiles and discovery/community functions

Kingdom adaptation:

- maintain broad collectible support rather than TCG-only schemas
- do not call a camera/photo upload an AI identification until the approved Vision system can return confidence-aware results
- preserve evidence/source/as-of metadata for value estimates and distinguish them from guaranteed sale proceeds

### Collectr, CollX, CLZ, and PriceCharting

These products were also reviewed during the immediately preceding IMP-004 reconnaissance and remain relevant to the Vault.

Useful recurring patterns:

- fast scanning/intake
- raw/graded/sealed item distinctions
- portfolio trends and historical values
- set/category views
- rich editable metadata
- storage information
- sold-history/profit records
- data export

Kingdom adaptation:

- unify useful collector workflows across many collectible categories
- connect valuation, provenance, physical location, acquisition history, media, and future Marketplace workflows to one authoritative treasure record
- avoid opaque or overconfident valuation claims

## Current open-source and GitHub research

### HomeBox

Repository: https://github.com/sysadminsmedia/homebox

Useful concepts:

- portable SQLite-backed inventory
- categories, locations, tags, and custom fields
- powerful search
- image upload
- document/warranty concepts
- purchase/maintenance tracking
- responsive design

Kingdom adaptation:

- preserve the simplicity of an embedded durable store during early development while keeping service boundaries suitable for future provider-independent scaling
- model collection organization and physical storage independently
- use the same authoritative service from UI and Keeper workflows

### Shelf.nu

Repository: https://github.com/Shelf-nu/shelf.nu

Useful concepts retained from prior reconnaissance:

- hierarchical physical locations
- QR/scanner-driven bulk workflows
- audit trails
- CSV portability
- custom metadata and tags

Kingdom adaptation:

- physical storage can represent rooms, safes, cabinets, display cases, shelves, binders, pages, pockets, boxes, rows, dividers, containers, and future collector-defined structures
- auditability and data portability are first-class rather than premium afterthoughts

### The Tin

Repository: https://github.com/the-tin-app/the_tin

Useful concepts retained from prior reconnaissance:

- privacy/offline-first recognition
- batch review before committing uncertain scans
- condition/variant review
- insurance documentation
- collector data ownership

Kingdom adaptation:

- future Vision intake should stage uncertain matches for collector approval rather than silently committing a guessed identity
- Vault media capture can be real now while AI identification remains gated until the Vision framework is actually available

### Bindarr

Repository: https://github.com/thenotoriousJeremy/bindarr

Useful concepts retained from prior reconnaissance:

- binder page/slot and box row/divider locations
- explicit missing/uncertain identification instead of confident guessing
- exports and backups
- detailed graded copy information

Kingdom adaptation:

- physical-location structure is generalized beyond cards
- future visual recognition must surface confidence and alternatives when identification is ambiguous

## Requirements adopted or strengthened by this session

1. Vault data is persistent SQLite data, not transient browser state.
2. Every treasure query and write is owner-scoped to the authenticated collector.
3. Collection folders and physical storage locations are different structures.
4. Physical locations support nested collector-realistic kinds including room, safe, cabinet, display case, shelf, binder, page, pocket, box, row, divider, and container.
5. Treasure records contain purchase and estimated-value evidence fields instead of one opaque price.
6. Estimated value records preserve currency, source, and as-of timestamp; UI language explicitly avoids treating estimates as guaranteed sale prices.
7. Search uses a dedicated full-text index rather than loading all records into browser memory.
8. Duplicate detection surfaces possible duplicate groups but never auto-merges collector records.
9. Vault photos are persisted as protected server-side media with SHA-256 evidence and authenticated retrieval.
10. CSV export is part of the core data-ownership contract.
11. Ownership history is structured separately from edit/audit history.
12. The Great Hall becomes authoritative from live Vault statistics only when the real Vault service is available.
13. The Keeper receives a bounded authorized Vault context while serving as Royal Curator; he does not receive unrestricted database access.
14. Camera capture is implemented as genuine media capture only. AI visual identification remains unavailable until the approved Vision capability exists.
15. Runtime readiness fails closed when required Vault components do not initialize.

## Ideas deliberately not adopted

- card-only or TCG-only schemas
- automatic acceptance of uncertain AI/photo identification
- public or guessable media paths without authorization checks
- one combined field for folder/category/physical location
- automatic duplicate merging
- opaque valuation claims without source/as-of context
- browser-only local collection state presented as durable Vault storage
- importing AGPL or otherwise incompatible source code from researched projects
- Marketplace commerce inside the Vault before the approved Marketplace phases

## Remaining IMP-005 hardening work after this reconnaissance

Before IMP-005 can be considered complete, verification must prove:

- persistence across process/store restart
- owner isolation through the HTTP layer
- secure media upload/retrieval
- search/filter/sort behavior
- hierarchy protections
- duplicate detection behavior
- export portability
- ownership-history behavior
- Great Hall live Vault summaries
- Keeper room context using authorized real records
- production artifact completeness
- responsive/accessibility behavior
- repository CI and dependency audit success

Import foundation and any remaining Phase-1 UI gaps must be completed or explicitly reconciled with IMP-005 before milestone completion.
