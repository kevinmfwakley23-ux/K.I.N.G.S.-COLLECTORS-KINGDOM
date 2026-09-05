# IMP-005 Royal Vault Phase 1 — Competitive & Technical Reconnaissance

**Research date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1

## Purpose

Identify current collector-app strengths, recurring collector pain points, and active open-source inventory patterns that can improve the Royal Vault without copying proprietary implementations or violating the locked Collector's Kingdom construction requirements.

The objective is not feature imitation. It is to build a broader, more trustworthy collector system with stronger ownership, physical-location control, evidence, portability, and K.I.N.G.S. AI assistance.

## Sources reviewed

### Current collector products / official material

- PriceCharting Collection Tracker: https://www.pricecharting.com/page/collection-tracker
- iCollect Everything product/support documentation: https://www.icollecteverything.com/ and https://www.icollecteverything.com/support/
- iCollect Everything 2026 website feature update: https://www.icollecteverything.com/2026/02/23/the-icollect-everything-website-has-been-completely-rebuilt/
- CLZ barcode-scanning / collector product material: https://clz.com/games/barcode-scanner
- Collectr current Google Play listing and 2026 release notes/reviews: https://play.google.com/store/apps/details?id=com.collectrinc.collectr
- iCollect Everything current Google Play listing and 2026 reviews: https://play.google.com/store/apps/details?id=com.icollect.icollecteverything

### Active / relevant GitHub implementations

- HomeBox — self-hosted inventory and organization: https://github.com/sysadminsmedia/homebox
- Snipe-IT — mature open-source asset management: https://github.com/grokability/snipe-it
- HomeAsset — hierarchical-location home inventory reference: https://github.com/pmitchell-dev/HomeAsset
- Grocy — inventory/barcode/API reference: https://github.com/grocy/grocy

## Strong competitor capabilities worth preserving or exceeding

### Fast intake

Current collector products increasingly reduce catalog-entry friction through:

- barcode / ISBN scanning;
- camera recognition for some collectible classes;
- database lookup;
- manual fallback;
- bulk scan / bulk add;
- quick-add from search results.

iCollect's 2026 web rebuild documents database search, barcode lookup, live scanning, image recognition for some categories, manual entry, drill-down navigation, bulk scan, and bulk add. CLZ continues to emphasize fast barcode entry and custom fields. PriceCharting supports barcode scanning, import, item photos, notes, grade/condition, quantity, and sold-item history.

**Kingdom implication:** the Vault data model must not assume one intake method. Manual creation must be first-class and future scanning/recognition must resolve into the same authoritative treasure identity.

### Variant, condition, grading, and exact-match awareness

Collector-specific tools distinguish grade, condition, language, edition/variant, set, and other subtype data because wrong variant selection destroys valuation reliability.

**Kingdom implication:** Phase 1 should preserve structured condition/variant fields plus extensible attributes rather than collapsing every collectible into a title-only record.

### Portfolio and history views

PriceCharting demonstrates collection value over time, purchase/sale information, profit tracking, folders, photos, notes, and grading-related views. Collectr's current release notes emphasize saved trade analysis and grade comparison.

**Kingdom implication:** Phase 1 must preserve acquisition fields and audit/history foundations even before the Treasury or Marketplace phases become authoritative.

## Recurring competitor weaknesses / opportunities to improve

### Search quality and rigid organization

Recent iCollect reviews report search changes that can return too many irrelevant records or zero results when wording is not exact. A recent review also explicitly requests tag-style organization because one collection/category is too limiting for crossover items.

**Kingdom improvement:**

- normalize searchable text;
- search across title, manufacturer/publisher, identifiers, notes, variant, tags/custom attributes as the model grows;
- allow a treasure to participate in flexible collection/group organization without changing its permanent identity;
- design saved filters/views later without forcing destructive recategorization.

### Data trust and valuation uncertainty

Recent Collectr reviews include complaints about missing items/sets, incorrect recognition, price swings, language gaps, and price values that collectors consider unreliable.

**Kingdom improvement:**

- never turn uncertain identification into a silent exact match;
- never present a valuation as authoritative without source, timestamp, condition/variant context, and confidence/evidence;
- keep valuation evidence separate from the core treasure identity so bad market data cannot corrupt ownership records;
- make manual correction/override possible with provenance rather than hiding machine uncertainty.

### Data durability and collector ownership

Recent iCollect reviews include concerns about records disappearing after updates and dissatisfaction with repeated monetization changes. These reviews reinforce that a serious collection system must treat the collector's catalog as durable user-owned data rather than ephemeral app state.

**Kingdom improvement:**

- persistent server-side authoritative records;
- explicit archive instead of silent destructive deletion;
- change history;
- import/export foundation from Phase 1;
- stable identifiers independent of UI or external catalog providers;
- later backup/restore and portable export formats.

### Basic-control paywalls

Current reviews across collector apps mention scan limits, organization limits, or recurring premium pressure.

**Kingdom product principle:** pricing strategy is separate from engineering, but the architecture should not make core data ownership, export, correction, or safe access dependent on a third-party provider or proprietary catalog lock-in.

## Open-source architecture lessons

### HomeBox

HomeBox emphasizes:

- simple but expandable architecture;
- SQLite portability;
- categories, locations, tags, and custom fields;
- search;
- image uploads;
- purchase and maintenance tracking;
- responsive use across devices.

**Adopt/improve:** keep the Vault portable and lightweight while adding collector-grade ownership, provenance, variant/condition, audit history, and future evidence-backed valuations.

### HomeAsset

HomeAsset demonstrates an especially useful physical-location model:

`House → Garage → Shelf A → Bin 3`

It also combines full-text search, category/tag filtering, images/documents, custom fields, serial/model fields, purchase information, and CSV export.

**Adopt/improve:** Royal Vault locations should be arbitrary-depth parent/child nodes so collectors can model Castle Room → Safe → Cabinet → Shelf → Box → Row → Divider or any custom equivalent. The path should be directly recoverable for "where is this treasure?" queries.

### Snipe-IT

Snipe-IT demonstrates the value of durable asset identity, purchase metadata, locations/assignment concepts, auditability, import tooling, APIs, and a mature separation between record identity and operational workflows.

**Adopt/improve:** a treasure must keep the same permanent ID across future Vault, Marketplace, grading, custody, legacy, and insurance workflows rather than spawning duplicate domain records.

### Grocy

Grocy demonstrates barcode lookup extension points and API-based inventory workflows.

**Adopt/improve:** future scan providers should be adapters feeding candidate identity data into a governed Vault intake workflow, not hard-coded assumptions inside the treasure table.

## Phase-1 Vault decisions from this research

1. **Permanent treasure UUID** owned by Collector's Kingdom.
2. **Owner-scoped authorization** on every Vault query/mutation.
3. **Archive semantics** for treasure removal; no silent destructive delete in the normal collector API.
4. **Collection groups** separate from treasure identity.
5. **Hierarchical physical locations** using parent-child nodes and computed location paths.
6. **Structured core fields + extensible attributes** so categories can grow without schema churn for every hobby.
7. **Identifier support** for barcode/UPC/EAN/ISBN/catalog/serial-style identifiers without assuming one catalog provider.
8. **Search/filter/sort** built server-side and owner-scoped.
9. **Duplicate candidate detection** based on normalized identifiers and meaningful fingerprint fields, returning candidates rather than auto-merging.
10. **Acquisition / cost fields** preserved now for future Treasury and Marketplace use.
11. **Audit/change events** for core treasure mutations.
12. **Export foundation** built from authoritative records, with import designed to validate before committing.
13. **Media metadata boundary** separated from core treasure identity so future file/object storage can evolve safely.
14. **AI uncertainty rule:** The Keeper may assist with identification and organization, but model output cannot silently create, merge, delete, revalue, or relabel Vault records.

## Superiority target

The Royal Vault should eventually combine the breadth and fast intake of dedicated collection apps with the physical-location rigor of strong inventory systems and the history/audit discipline of mature asset-management software.

Its differentiator is trust: one durable treasure identity, explicit collector ownership, portable records, deep physical-location knowledge, evidence-separated valuations, transparent uncertainty, and K.I.N.G.S. AI assistance that never pretends guesses are verified facts.
