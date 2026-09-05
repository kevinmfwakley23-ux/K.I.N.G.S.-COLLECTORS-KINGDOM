# 2026-09-04 — Set Completion & Composable Vault Competitive Recon

Status: engineering research record for IMP-005 Royal Vault Phase 1.

## Authority

This research is subordinate to the locked K.I.N.G.S. Collector's Kingdom Construction Documents. The Construction Documents remain the highest product and architecture authority.

Locked Vault requirements driving this pass include:

- collection sets;
- monitoring collection completeness;
- Incomplete Sets as a Vault view;
- flexible organization rather than prescriptive category silos;
- natural search and saved searches;
- supporting documents, custom labels, grading/authentication expansion paths;
- large-collection responsiveness;
- collector control and trustworthy Keeper assistance.

## Current public-product signals reviewed

### CollX / card-first collection products

Current card-first products continue to emphasize collection/set progress, owned-versus-missing workflows, quick filtering, scanning, and checklist-style completion. These workflows are useful, but a Kingdom implementation cannot be card-specific and must not infer a completed slot from a similar title alone.

### Collectr / portfolio collection products

Portfolio-oriented products reinforce the value of fast collection shortcuts, progress views, and preserving useful collector state between sessions. The Kingdom should combine that convenience with explicit provenance and physical-location authority.

### Shelf

Shelf's current open-source product demonstrates useful composable inventory patterns:

- hierarchical locations;
- custom fields;
- categories and tags;
- saved filter presets;
- attachments;
- audit/activity history;
- CSV portability;
- kit/group concepts.

Kingdom adoption: preserve these ideas as orthogonal capabilities around one authoritative treasure record rather than creating separate databases for every workflow.

### HomeBox

HomeBox continues to prioritize portability, lightweight operation, categories/locations/tags, attachments, and an expandable model. Its newer entity-oriented architecture further reinforces the value of reusable metadata/attachment/location capabilities instead of rigid item-type schemas.

Kingdom adoption: keep category profiles flexible, retain one authoritative Vault treasure identity, and allow organization/evidence/set membership to compose around it.

## Engineering decisions adopted

### 1. Explicit Set → Expected Entry → Treasure Link model

Set completion is derived from durable database relationships. The Kingdom does not infer membership from names, categories, images, or AI similarity.

A treasure fills a set entry only through an explicit collector-authorized or future trusted-catalog link.

### 2. Quantity-aware completion

Expected quantities and linked treasure quantities are distinct. Completion uses current authoritative Vault quantity and therefore automatically falls when an owned quantity is reduced or the linked treasure is deleted.

### 3. No cached magic percentage

Completion percentage is derived from current expected-entry and treasure-link state. A cached display percentage is not authoritative.

### 4. Incomplete Sets is a real derived view

A set appears in Incomplete Sets only when it has at least one expected entry and one or more missing required units. Empty sets are not treated as complete.

### 5. Category-neutral sets

The same model must support sports cards, TCGs, Hot Wheels, Funko, comics, coins, stamps, autographs, music/movie/sports memorabilia, action figures, building sets, tickets, custom categories, and future lawful collectible families.

### 6. One treasure cannot silently satisfy multiple slots in the same set

Variants, parallels, colors, signatures, grades, and editions can represent distinct expected entries. One treasure record cannot automatically fill multiple slots in one set.

### 7. Provenance-bearing future catalog imports

The set service reserves a catalog-import source type, but production catalog ingestion shall not be enabled until the import path carries source/provenance and collector review. No external checklist may silently become authoritative.

## K.I.N.G.S. parent-core reuse

K.I.N.G.S. AI remains read-only during Kingdom development. Proven deterministic parent logic may be inspected at a pinned commit and copied/adapted into `packages/kings-core` when useful.

Current useful direct-copy categories include:

- memory context authority;
- memory relevance;
- knowledge retrieval;
- context optimization;
- budget enforcement.

Verification and tool authorization are pattern-only where Kingdom trust/business rules differ. Privileged model/provider/web execution remains centralized in the K.I.N.G.S. parent runtime.

## Rejected shortcuts

- title-based automatic set membership;
- AI declaring a missing item owned without a durable treasure link;
- a `favorite` or `complete` text tag standing in for explicit state;
- cached completion values that can drift from Vault truth;
- separate category databases that fragment the collector's Vault;
- treating uploaded certificates or references as independently verified without a real verifier;
- importing K.I.N.G.S. autonomous-coding workforce dependencies into the Kingdom merely to reuse one governance concept.

## Next implementation sequence

1. verify Collection Set HTTP/runtime composition;
2. expose a real Vault set/checklist UI;
3. expose Incomplete Sets in Royal Vault system views;
4. make Keeper context aware of explicit set progress without over-sharing collector data;
5. add export/import support for collector-defined checklists only after source/provenance semantics are preserved;
6. continue performance/accessibility verification before closing IMP-005.
