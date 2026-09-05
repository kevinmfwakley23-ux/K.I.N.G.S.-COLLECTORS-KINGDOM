# IMP-005 Collector Workflow & Performance Recon — 2026-09-05

Status: ACTIVE ENGINEERING INPUT  
Authority: subordinate to locked K.I.N.G.S. Collector's Kingdom Construction Documents and verified repository architecture.

## Locked authority reviewed

The current build remains governed by PRD-002 Royal Vault, INF-003 Data & Storage Architecture, INF-004 Synchronization Framework, INF-007 Testing & Quality Assurance, ENG-004 Database Design Standards, and IMP-005 Royal Vault Phase 1.

Relevant locked requirements include:
- large Vaults remain responsive;
- collection organization remains flexible rather than prescriptive;
- the Vault supports tags, custom labels, search, media, ownership history, export, and future expansion without redesign;
- The Keeper acts as Royal Curator and shall help organize collections, recommend tags, identify possible duplicates, suggest improvements, and locate treasures;
- performance work must preserve correctness and authoritative ownership;
- automated and manual verification are both required.

## Fresh product research

### iCollect Everything — 2026 web rebuild
Source: https://www.icollecteverything.com/2026/02/23/the-icollect-everything-website-has-been-completely-rebuilt/

Useful current signals:
- responsive web experience across phone, tablet, and desktop;
- full-screen mobile modals and touch-oriented image browsing;
- database search, barcode/ISBN lookup, camera scanning, image recognition, manual entry, and bulk add;
- inline editing with unsaved-change awareness;
- saved/shareable views;
- custom collections with typed custom fields;
- collection statistics, advanced filtering, and CSV export.

Kingdom adoption decisions:
- adopt responsive, saved-view, schema-flexibility, and bulk-safe workflow principles;
- do not claim camera recognition until a real identification provider and evidence path exist;
- do not copy implementation code or proprietary catalog data.

### Collectr — Google Play, updated August 14, 2026
Source: https://play.google.com/store/apps/details?id=com.collectrinc.collectr

Useful current signals:
- portfolio-style collection management;
- raw, graded, and sealed item distinctions;
- multi-currency valuation presentation;
- market trend and gain/loss views;
- broad TCG catalog support.

Kingdom adoption decisions:
- retain category-specific metadata and future valuation seams;
- preserve explicit source/as-of evidence for value rather than presenting ungrounded market truth;
- valuation feeds remain Observatory/Treasury infrastructure, not a fake IMP-005 feature.

### CollX — Google Play, updated August 26, 2026
Source: https://play.google.com/store/apps/details?id=app.collx.android

Useful current signals:
- fast scan-to-identification workflow;
- portfolio tracking;
- marketplace handoff;
- sports and TCG domain specialization;
- shipping/tracking and transaction workflows in its commerce layer.

Kingdom adoption decisions:
- preserve a future-ready Vault-to-Marketplace handoff rather than mixing commerce into Vault ownership truth;
- scanning remains deferred until real visual-identification support exists;
- marketplace commerce remains IMP-007/IMP-008 scope.

### hobbyDB
Sources:
- https://help.hobbydb.com/support/solutions/articles/36000044300-an-introduction
- https://help.hobbydb.com/support/solutions/articles/36000037279

Useful current signals:
- very broad collectible-domain modeling;
- linked collectible concepts such as maker, model, theme, character, and brand;
- collection management separated from public showcase behavior;
- quantity, private notes, estimated value, privacy state, lists, wishlists, and marketplace links.

Kingdom adoption decisions:
- keep one flexible Vault instead of separate category applications;
- keep owner-private Vault truth separate from future public Marketplace/showcase state;
- continue expanding category-aware details without a schema redesign.

## Fresh open-source repository research

### Shelf.nu
Repository: https://github.com/Shelf-nu/shelf.nu

Useful engineering signals:
- active physical-asset management architecture;
- strong location and asset tracking;
- QR-oriented physical lookup;
- role-aware organization for large physical inventories.

Adoption decision:
- retain precise physical-location hierarchy and scalable lookup patterns;
- QR/label workflows are a future enhancement, not required to close IMP-005.

### HomeBox
Repository: https://github.com/sysadminsmedia/homebox
License: AGPL-3.0.

Useful engineering signals:
- SQLite-backed portable deployment;
- categories, locations, tags, custom fields, images, documents, purchase history, and responsive UI;
- recent architecture work unifies entity capabilities to reduce future redesign pressure;
- project documentation emphasizes backups before significant schema evolution.

Adoption decision:
- adopt only architectural lessons and public behavior patterns; no HomeBox source code is copied;
- continue provider-independent SQLite portability, custom metadata, supporting documents, and verified recovery;
- preserve explicit Kingdom domain models rather than performing a broad entity rewrite during IMP-005.

## Engineering decisions for the current build

### 1. Large-Vault list performance
The production Vault now installs indexes matching the actual default, value, and year ORDER BY expressions. Regression tests use SQLite `EXPLAIN QUERY PLAN` to prove the intended account-scoped indexes are selected.

### 2. Grounded tag recommendations
The next locked gap to close is Royal Curator tag recommendation.

Requirements for the Kingdom implementation:
- recommendations come from the authenticated collector's own Vault patterns;
- another collector's tags can never influence results;
- existing tags are never recommended again;
- suggestions are advisory only and never auto-applied;
- the response explains its evidence basis rather than presenting an AI guess as fact;
- results are bounded for Keeper context and UI performance;
- a collector with insufficient matching history receives an honest empty result.

### 3. Future bulk workflows
Bulk add/edit is a strong competitive pattern and should be added only with:
- preview-before-commit behavior for destructive or wide mutations;
- explicit selected-record scope;
- transaction boundaries;
- audit history;
- owner isolation;
- no automatic duplicate merge;
- bounded request size and progress/error reporting.

This should follow completion of the locked IMP-005 acceptance gaps rather than delaying the phase indefinitely.

## Rejected shortcuts

- fake AI/image recognition without a real provider and confidence/evidence path;
- fake live market values;
- automatic duplicate merging;
- automatic tag mutation from model output;
- copying AGPL or proprietary implementation code into the Kingdom;
- broad schema rewrites solely to imitate competitors;
- claiming manual accessibility/device verification from static tests.

## Current priority order

1. Keep the verified performance-index head green.
2. Implement grounded Royal Curator tag recommendations with owner isolation and no automatic mutation.
3. Expose bounded recommendations to authenticated HTTP and Keeper context.
4. Add user-visible recommendation controls only after the service contract is verified.
5. Finish IMP-005 acceptance/documentation and manual device/accessibility checks before merge.
