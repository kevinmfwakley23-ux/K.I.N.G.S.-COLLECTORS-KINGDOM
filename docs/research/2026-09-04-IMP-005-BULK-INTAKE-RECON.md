# IMP-005 Royal Vault — Bulk Intake Competitive Recon

Date: 2026-09-04
Status: engineering research record
Authority: subordinate to the locked K.I.N.G.S. Collector's Kingdom Construction Documents

## Construction-document requirements controlling this work

The locked Vault PRD and IMP-005 require real treasure storage, collection organization, search, categories, media, statistics, duplicate-detection foundation, import/export foundation, audit history, permissions, storage location, and Keeper assistance. The Data & Storage Architecture requires durable, portable, secure records; the Synchronization Framework requires continuity and preservation of collector work.

This reconnaissance therefore focuses on how leading products reduce intake friction and where they fail, then adopts only ideas compatible with the locked Kingdom architecture.

## Current product findings

### CollX

Current Google Play and official product material emphasize:

- visual recognition against a very large sports-card/TCG database;
- graded-card barcode recognition;
- portfolio-value tracking using historical auction pricing;
- grid/list/set views and filters;
- CSV export for Pro users;
- marketplace listing, offers, bundled Deals, shipping, and buyer/seller protection;
- higher-accuracy Scan+ recognition and dealer-oriented bulk scanning.

Recent Play Store feedback is especially important: users report scanner/search instability, crashes/cache growth, disappearing large uploads that required recovery, and difficulty identifying exact parallels/colors. Those complaints reinforce the Kingdom rule that intake speed must never outrank data preservation, variant certainty, or recoverability.

### Collectr

Current Google Play material emphasizes:

- multi-TCG portfolio management;
- raw, graded, and sealed product support;
- large market database;
- real-time portfolio valuation;
- gains/losses and market trends;
- multi-currency portfolio views.

The Kingdom should ultimately match useful portfolio visibility while preserving stronger provenance, physical-location, and evidence controls.

### CLZ

Current first-party product material emphasizes:

- fast barcode/catalog-number intake;
- manual entry when database lookup fails;
- custom fields;
- multiple collections;
- configurable list/card views and grouping;
- cloud backup and multi-device synchronization;
- mature handling of collections containing thousands of items.

A key lesson is that fast lookup must always retain a manual path. Collector's Kingdom should never make AI recognition or a third-party catalog mandatory for adding a real treasure.

### PriceCharting

Current first-party material emphasizes:

- free unlimited collection tracking;
- bulk collection import;
- historic collection value;
- condition/grade/quantity editing;
- barcode intake;
- multiple item photos and notes;
- sold-item history, sale date/price, and profit tracking;
- folders, price-change sorting, dashboards, grading opportunities, wishlists, and marketplace access.

The strongest portable-data lesson is that import and export are normal collector expectations rather than administrator-only tools.

### Shelf.nu open-source repository

The current Shelf.nu repository demonstrates useful non-collector inventory patterns:

- hierarchical physical locations;
- QR/barcode scanning;
- custom fields;
- categories and tags;
- powerful search/filtering with saved presets;
- CSV import/export;
- audit trails;
- bulk actions;
- role-based permissions;
- portability and production quality gates.

The Kingdom does not copy Shelf implementation or visual design. The useful architectural idea is that physical location, bulk intake, auditability, and authorization belong in the same real inventory system rather than separate spreadsheets.

## Adopted Kingdom-native improvements

This session implements a safer portable-intake foundation:

1. **Preview before commit.** CSV is validated without writing any treasure data.
2. **Exact-file fingerprint.** Preview returns a SHA-256 fingerprint. Commit is rejected unless the exact CSV bytes match the reviewed fingerprint.
3. **Whole-import validation.** Invalid rows block commit rather than silently importing only the easy rows.
4. **No automatic duplicate merge.** Possible duplicate rows are warnings; collector data is never merged or discarded automatically.
5. **Explicit organization creation.** Missing collection-folder or physical-location paths are reported. Creating them during commit requires explicit collector opt-in.
6. **Hierarchy-preserving portability.** Export includes full folder paths, full physical-location paths, and location-kind chains so a Vault export can preserve organization rather than flatten it.
7. **Rollback on runtime failure.** If a commit fails after records begin creating, newly created treasure records and import-created organization nodes are removed on a best-effort rollback path rather than leaving an apparently successful partial import.
8. **Bounded resource use.** Phase-1 import limits protect the service from unbounded payloads while still supporting substantial collection migrations.
9. **Manual-first authority.** Import and manual treasure creation remain valid even when future AI/vision identification is unavailable.

## Explicitly rejected shortcuts

- No blind one-click import that writes before validation.
- No AI or database match is treated as authoritative merely because confidence is high.
- No automatic duplicate deletion or merging.
- No invented valuation during import.
- No silently created folders/locations unless the collector explicitly enables that behavior.
- No flattening of precise physical storage paths in Kingdom-generated exports.
- No competitor source code is copied.

## Next superiority targets

After the Phase-1 portable foundation is fully verified, future research/build passes should continue toward:

- configurable column mapping for major competitor export formats;
- streaming/batched imports for collections far above the current Phase-1 single-file limit;
- resumable import jobs with durable progress and restart recovery;
- QR/barcode labels that resolve directly to protected Vault records and physical locations;
- vision-assisted candidate identification with explicit uncertainty and collector approval;
- valuation evidence timelines rather than opaque single-number prices;
- set-completion and missing-item intelligence;
- reversible bulk edits and bulk location moves;
- offline capture queues integrated with the locked synchronization framework.

## Engineering conclusion

The strongest differentiator is not simply scanning faster than another app. Collector's Kingdom should make large-scale intake **safer, more recoverable, more transparent, and more physically organized** while retaining collector authority over every uncertain match and permanent record.
