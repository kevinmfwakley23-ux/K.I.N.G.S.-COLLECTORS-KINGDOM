# IMP-005 Competitive Research Refresh

Date: 2026-09-04 (America/Denver)
Status: Research input subordinate to locked Construction Documents
Milestone: IMP-005 — Royal Vault Phase 1

## Authority

The locked K.I.N.G.S. Collector's Kingdom Construction Documents remain the highest product and architecture authority. This research may improve implementation choices but must not silently override the PRD, implementation sequence, collector-control requirements, security rules, or Kingdom identity.

## Construction-document requirements revalidated

The Vault remains the authoritative permanent home for collector-owned treasures. Relevant locked requirements revalidated before this build session include:

- individual collectibles, folders, sets, tags, custom labels, Favorites, ownership history, purchase/sale history, notes, photographs, multiple images, supporting documents, and Marketplace status;
- Grid, List, Binder, Gallery, Recently Added, Favorites, Duplicates, Incomplete Sets, Marketplace Ready, and Recently Updated views;
- flexible organization, saved searches, natural search, Keeper/Royal Curator assistance, large-collection responsiveness, export, audit history, backups/recovery, accessibility, and future Marketplace/Legacy expansion without redesign;
- IMP-005 Phase 1 still requires real treasure CRUD, organization, media, search/filter/sort, statistics, duplicate detection foundation, import/export, permissions, audit history, responsive frontend behavior, and successful quality gates.

## Current commercial products reviewed

### Collectr — Google Play, updated 2026-08-14

Observed strengths:

- portfolio value and market-trend presentation;
- broad TCG catalog and multi-currency support;
- biggest gain/loss visibility;
- saved/revisitable Trade Analyzer history;
- deep links into showcases and sets;
- quick-add behavior;
- grade comparison.

Kingdom response:

- preserve the Royal Vault's broader multi-collectible scope instead of becoming card-centric;
- continue separating recorded estimates from guaranteed sale value;
- future valuation work should expose source/as-of evidence and eventually comparable sold records rather than one opaque number;
- deep-linkable Vault views and explicit saved workflows are useful patterns, but must remain collector scoped and evidence based.

Source: https://play.google.com/store/apps/details?id=com.collectrinc.collectr

### CollX — Google Play, updated 2026-08-26

Observed strengths:

- large visual-recognition card database;
- historical auction pricing;
- grid/list/set views;
- set-completion tracking and printable missing-card checklists;
- Marketplace workflows and protected payments;
- persistent filters during search in the latest update.

Observed weakness from current user feedback:

- difficult parallel/color identification and reported crash/cache friction.

Kingdom response:

- preserve search/filter/view state consistently;
- build collection-set completion from explicit membership and expected-item records, never inferred name similarity;
- keep uncertain identification reviewable rather than silently choosing a variant;
- large-collection performance and bounded local storage/cache behavior remain explicit quality requirements.

Source: https://play.google.com/store/apps/details?id=app.collx.android

### Minti — App Store, current 2026 listing

Observed strengths:

- broad multi-category positioning across cards, comics, coins, games, sneakers, vinyl, LEGO, watches, and many other collectible families;
- emphasis on sold-price evidence from multiple sources rather than one unexplained value;
- price history and visual identification.

Kingdom response:

- this reinforces the locked multi-category architecture already implemented in Vault taxonomy/details;
- valuation should become evidence-forward: source, date, comparable sale, condition/grade match quality, and uncertainty must remain visible;
- no external pricing claim becomes authoritative merely because an AI or provider produced it.

Source: https://apps.apple.com/us/app/minti-collect-sell/id6761207770

## Open-source products reviewed

### HomeBox

Current project characteristics relevant to the Kingdom:

- SQLite-backed portable inventory;
- categories, hierarchical locations, tags, custom fields;
- image and document tracking;
- purchase/maintenance information;
- responsive UI and low-resource self-hosting design.

Kingdom response:

- continue the Vault's SQLite portability and protected-media/document design;
- retain physical-location hierarchy as a first-class model separate from collection folders;
- treat data portability and backup/recovery as ownership requirements, not premium conveniences.

License note: HomeBox is AGPL-3.0. Do not copy incompatible source code into the Kingdom. Concepts may inform independent implementation.

Source: https://github.com/sysadminsmedia/homebox

### Shelf.nu

Current project characteristics relevant to the Kingdom:

- hierarchical physical locations;
- QR asset tags;
- custody/history concepts;
- role-based access;
- strong CI/deployment gates and documented accessibility goals.

Kingdom response:

- hierarchical location/custody ideas remain useful for future lending/display/legacy workflows;
- QR labels are a future practical extension for locating physical treasures, but are not required to close current IMP-005;
- keep CI, accessibility, authorization, and auditability as release gates.

License note: Shelf.nu is AGPL-3.0. Do not copy incompatible source code into the Kingdom.

Source: https://github.com/Shelf-nu/shelf.nu

## Competitive decisions for the next Vault work

1. Finish and verify explicit Favorites before starting another capability.
2. Build set-completion as an explicit data model:
   - collector-defined or trusted-catalog set;
   - expected set items;
   - owned-item links;
   - missing-item calculation;
   - completion percentage derived from recorded facts;
   - no guessed membership;
   - no automatic merge or replacement of owned treasure records.
3. Make Incomplete Sets a derived system view only after that model exists.
4. Preserve current filters/search/view modes across workflows; do not regress to transient UI state.
5. Future valuation work should move toward evidence-backed comparable sales and history, with source/date/condition transparency and uncertainty labels.
6. Do not expose Marketplace Ready until explicit readiness criteria and collector-controlled status exist.
7. Keep Vision/scan claims separate from camera upload until an actual identification pipeline is available and tested.

## Competitive advantage to protect

The Kingdom should not compete by claiming the most AI. It should compete by combining:

- broad collectible support;
- collector-owned durable data;
- evidence-forward valuation and provenance;
- explicit uncertainty;
- physical-location organization;
- trustworthy natural search;
- persistent Royal Curator context;
- flexible low-cost model routing through K.I.N.G.S. AI;
- secure export/portability;
- an immersive but practical Royal Vault experience.

No feature is considered competitive merely because it exists in the UI. It must be backed by real data, real authorization, real persistence, and passing tests.