# 2026-09-04 — Extended Search & Royal Curator Competitive Recon

Status: Verified engineering reconnaissance and implementation record for IMP-005 Royal Vault Phase 1

## Authority order

1. Locked K.I.N.G.S. Collectibles Construction Documents.
2. Verified Collector's Kingdom architecture, security boundaries, and executable tests.
3. Current competitor, web, Play Store, and public-repository research.

External products are evidence for useful interaction patterns only. They do not override the locked Kingdom architecture and their code is not copied.

## Locked requirements driving this pass

PRD-002 and IMP-005 require the Vault to remain the authoritative permanent home of the collector's treasures, scale from one collectible to hundreds of thousands, keep organization flexible rather than prescriptive, support natural search, preserve ownership history, support future grading/authentication without redesign, and give The Keeper natural collection-search and Royal Curator assistance.

The locked natural-search examples include requests such as:
- Show my Charizards.
- Find graded comics.
- What duplicates do I own?
- Show everything from 1999.

The locked organization requirements also include saved searches. This means large-collection navigation should allow a collector to preserve useful combinations of natural query, category, physical/folder organization, sort order, and presentation mode rather than rebuilding the same search every session.

## Current competitor observations

### iCollect Everything
Current product material emphasizes 40+ built-in collection types, custom collections, configurable custom fields, scanning, image recognition, cloud access, filtering/sorting, and broad category coverage.

Usable lesson: broad collectors need configurable schemas and one home for many collection types.

Kingdom improvement: keep category names collector-owned, retain a common treasure model, and layer category intelligence/flexible details over it instead of fragmenting each hobby into an unrelated database.

Sources reviewed:
- https://www.icollecteverything.com/support/
- https://www.icollecteverything.com/2026/03/27/best-collection-management-apps/

### CollX
Current product material emphasizes fast sports/TCG photo recognition, current market price, portfolio tracking, filtering/search, community, trades, grading, and selling.

Usable lesson: capture and discovery must be fast enough that the database does not become a chore.

Kingdom improvement: recognition/market data must be evidence-aware and separated from the permanent collector record. The Vault should retain provenance, physical location, custom lawful categories, and explicit verification state instead of making price recognition the center of the product.

Source reviewed:
- https://collx.app/

### PriceCharting
Current collection tracker supports multiple collectible categories, unlimited collection tracking, historic values, condition/grade/quantity, barcode intake, photos, sold-item history, sale price/date, profit tracking, folders, and collection dashboards.

Usable lesson: acquisition and disposition history are important and should survive beyond a current-value snapshot.

Kingdom improvement: preserve transaction/ownership history separately from estimated values and technical audit history, and keep future Treasury/Observatory financial interpretation distinct from confirmed Vault records.

Source reviewed:
- https://www.pricecharting.com/page/collection-tracker

### CLZ Comics
Current CLZ Comics material emphasizes barcode/cover recognition, variant and key-comic information, creators/characters, personal storage information, grading/slab fields, custom fields, multiple collections, cloud sync, and external value integrations. 2026 updates also show continuing work on custom fields, tablet/foldable layouts, and variant recognition.

Usable lesson: serious collectors expect hobby-specific depth, not only title/category/year.

Kingdom improvement: category profiles recommend deep fields while the protected flexible-attribute service prevents a schema redesign for every collectible niche.

Sources reviewed:
- https://clz.com/comics/mobile
- https://clz.com/comics/whatsnew

### TCGplayer
Current product material emphasizes fast card scanning, condition/language-sensitive pricing, saved collection lists, CSV/plaintext export, and a short path from scanned inventory to selling.

Usable lesson: intake should flow naturally into collection management and later commerce.

Kingdom improvement: preserve the Vault as the authoritative record first; Marketplace publication remains a separately authorized future action rather than silently turning an owned treasure into a listing.

Sources reviewed:
- https://www.tcgplayer.com/mobile-app
- https://help.tcgplayer.com/hc/en-us/articles/115009506407-TCGplayer-App-FAQ

## Public repository observations

### HomeBox — sysadminsmedia/homebox
Useful patterns:
- simple-but-expandable organization;
- categories, locations, tags, and custom fields;
- search;
- image and document tracking;
- portable SQLite-backed deployment;
- responsive UI.

Kingdom improvement: retain that portability/flexibility while adding collector-grade provenance, category profiles, verification state, value evidence, and Royal Curator assistance.

Repository:
- https://github.com/sysadminsmedia/homebox

### Shelf — Shelf-nu/shelf.nu
Useful patterns:
- hierarchical physical locations;
- custom fields;
- full-text search plus advanced filters;
- saved filter presets;
- QR/barcode scanning and bulk actions;
- CSV import/export;
- audit trails.

Kingdom improvement: use these ideas in a collector-owned context with provenance, category-specific fields, conservative duplicate handling, and one AI retrieval layer shared by UI and Keeper rather than separate search implementations.

Repository:
- https://github.com/Shelf-nu/shelf.nu

## Adopted and improved in this pass

### 1. Extended collector search index
The Vault search index combines core treasure record fields, tags, folder and physical-location context, category-specific flexible fields, source/verification status, ownership/provenance event text, and acquisition/value-source context. The index remains collector-scoped.

### 2. Natural-query cleanup
Common conversational filler terms are removed before FTS matching so a request such as `show me my Jordan Bulls PSA 9` searches the meaningful collector terms instead of failing on words such as `show`, `me`, or `my`.

### 3. Incremental synchronization
The extended index records version information for the core treasure, flexible attributes, provenance, folder, and location. Small edits refresh only affected treasures; a first initialization or sufficiently large stale set performs a rebuild.

### 4. One retrieval path for UI and AI
Authenticated `/api/vault/treasures?query=...` uses the extended search layer when available, retaining the original core FTS as a fallback. The Royal Curator receives a bounded query-relevant retrieval context from the same search capability rather than an unrestricted dump of the Vault.

### 5. Bounded Keeper context
Per Keeper request:
- at most 8 recent treasures;
- at most 8 query-relevant treasures;
- at most 12 flexible details per treasure;
- verification status/provider may be included;
- certificate/source reference strings are intentionally withheld from model context;
- collector-entered estimates and verification claims remain labeled by source/status.

### 6. Persistent Saved Vault Views
Saved Views are now implemented as collector-owned SQLite records reachable through authenticated Vault APIs and the live Vault sidebar.

A Saved View may preserve:
- a natural Vault query;
- category;
- collection folder;
- physical location;
- tag where supported;
- sort order;
- Grid/List display preference.

Trust and lifecycle rules:
- maximum 100 saved views per collector;
- names are unique per collector without case sensitivity;
- another collector cannot read or reuse a saved view;
- referenced folder/location IDs must belong to the same collector;
- deleting an empty referenced folder/location clears that filter with `ON DELETE SET NULL` rather than destroying the saved view;
- omitted optional values are persisted as SQL NULL rather than unsafe JavaScript `undefined`;
- explicit null during update clears a saved filter while omitted values preserve the prior setting;
- applying a Saved View drives the normal Vault search/filter controls instead of a second hidden query engine;
- browser-module wiring is regression-tested so packaged-but-unreachable UI assets fail CI.

Verification: GitHub Actions run #76 passed the full repository quality gate and production dependency audit on the Saved View regression-test head.

## Rejected shortcuts

The following were explicitly rejected:
- separate incompatible databases for every hobby;
- using only title/category search;
- sending the entire Vault to an AI model;
- treating collector-entered certification text as verified;
- treating estimated value as confirmed market value;
- auto-merging possible duplicate records;
- turning Vault records into Marketplace listings without a separate authorized action;
- rebuilding a large search index after every minor edit;
- storing Saved Views only in browser local storage;
- allowing Saved Views to reference another collector's organization IDs;
- creating a second search implementation only for Saved Views;
- copying competitor source code or protected visual identity.

## Next competitive opportunities after this verified layer

Subject to the Construction Documents and IMP-005 acceptance boundary:
- supporting-document storage and evidence attachment;
- Binder and Gallery views;
- Favorites, Recently Added, Incomplete Sets, Marketplace Ready, and other locked Vault views;
- batch actions that remain previewable/reversible;
- real verifier adapters for grading/authentication providers;
- real Vision-assisted identification only when an approved operational vision service exists;
- later Observatory/Treasury price-history evidence that clearly separates confirmed transactions, estimates, trends, and Keeper analysis.

## Engineering conclusion

The strongest competitive position is not to become a wider card scanner. Collector's Kingdom should become the collector-owned system of record that can understand many legal collectible categories deeply, retrieve them naturally, preserve their physical and historical context, distinguish evidence from estimates, and let The Keeper reason over only the authorized records relevant to the collector's question.
