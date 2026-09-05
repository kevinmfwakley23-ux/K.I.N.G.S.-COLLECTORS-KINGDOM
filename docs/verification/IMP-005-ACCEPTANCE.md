# IMP-005 — Royal Vault Phase 1 Acceptance Matrix

Status: **DRAFT / PRE-MERGE**  
Authority: locked Construction Documents → verified repository architecture/tests → fresh external research.

This record distinguishes **implemented**, **automatically verified**, **manual verification still required**, and **later-phase infrastructure**. A green automated gate alone does not make IMP-005 complete.

## Verification legend

- **GREEN** — implemented and covered by the repository's automated verification/CI.
- **MANUAL OPEN** — implementation exists, but the locked phase also requires real manual/device/assistive-technology verification.
- **LATER PHASE** — explicitly required by broader Kingdom infrastructure/launch documents but not honestly deliverable as a complete production system inside IMP-005 alone.
- **NOT CLAIMED** — intentionally absent; the Kingdom must not present this capability as complete.

## Locked IMP-005 deliverables

| Area | Status | Current evidence / boundary |
| --- | --- | --- |
| Add treasures | GREEN | Persistent SQLite CRUD and authenticated HTTP/browser flow. |
| Edit treasures | GREEN | Owner-scoped updates, audit events, validation. |
| Remove treasures | GREEN | Owner-scoped deletion, related cleanup/cascades, no cross-collector access. |
| Collection folders | GREEN | Nested conceptual folders with non-empty protection. |
| Physical locations | GREEN | Nested room/safe/cabinet/display/shelf/binder/page/pocket/box/row/divider/container model. |
| Categories | GREEN | Flexible collector-owned text plus category profiles and custom lawful categories. |
| Category-specific details | GREEN | Flexible attributes with source/verification state and no self-promotion to external verification. |
| Tags | GREEN | Persistent tags plus grounded collector-pattern recommendation service. |
| Keeper tag recommendations | GREEN | Collector-only peer evidence, bounded result, authenticated API, visible UI guidance, no automatic application. |
| Search | GREEN | Dirty-tracked extended FTS with incremental refresh and structured filters/sorts/pagination. |
| Large-Vault search responsiveness | GREEN | Clean searches avoid full-Vault freshness scans; regression tests cover dirty refresh behavior. |
| Collection list sort performance | GREEN | Account-scoped updated/value/year indexes; SQLite query-planner tests prove intended index selection. |
| Grid view | GREEN | Browser view mode. |
| List view | GREEN | Browser view mode. |
| Binder view | GREEN | Browser view mode and saved preference. |
| Gallery view | GREEN | Browser view mode and saved preference. |
| Favorites | GREEN | Explicit owner-scoped relationship and system view. |
| Recently Added | GREEN | Authoritative timestamp-based system view. |
| Recently Updated | GREEN | Authoritative timestamp-based system view. |
| Possible Duplicates | GREEN | Conservative normalized-key groups; no automatic merge. |
| Keeper duplicate assistance | GREEN | Bounded sanitized duplicate groups, max 5 groups / 4 records, no merge/delete authority. |
| Collection Sets | GREEN | Explicit expected-entry model with collector-selected owned treasure links. |
| Incomplete Sets | GREEN | Derived from current set relationships/quantities, no title guessing. |
| Saved searches/views | GREEN | Owner-scoped Saved Vault Views preserve query/filter/sort/display mode. |
| Media uploads | GREEN | Authenticated JPEG/PNG/WebP/HEIC/HEIF intake with byte-signature/container validation before persistence. |
| Image gallery/detail media | GREEN | Owner-scoped media retrieval and treasure detail gallery. |
| Supporting documents | GREEN | Protected evidence service for PDF/JPEG/PNG/WebP with integrity/trust metadata. |
| Ownership history | GREEN | Structured provenance timeline separate from technical audit history. |
| Audit history | GREEN | Domain actions recorded independently from ownership provenance. |
| Statistics | GREEN | Real aggregate collection/category/unit/value/duplicate statistics. |
| Import foundation | GREEN | Preview-before-commit CSV, exact-byte fingerprint, validation, explicit hierarchy creation, no auto-merge. |
| Export foundation | GREEN | Portable CSV preserving physical organization. |
| Marketplace expansion path | GREEN | Private Marketplace Preparation + derived handoff readiness without pretending commerce exists. |
| Royal Curator query retrieval | GREEN | Bounded recent + query-grounded Vault context through protected search. |
| Keeper uncertainty / trust | GREEN | Context carries estimate/trust state; references withheld where inappropriate; system prompt forbids fabricated mutations/data. |
| Recovery primitive | GREEN | Consistent `VACUUM INTO` Vault snapshot + referenced media/evidence + SHA/integrity/FK verification + restore-to-empty-target tests. |
| Automated accessibility semantics | GREEN | Dialog labeling/focus return, keyboard treasure cards, focus styles, live regions, alt text, reduced motion, forced colors, contrast checks. |
| Responsive implementation | GREEN | Explicit CSS adaptations at desktop/tablet/phone boundaries. |
| Manual accessibility acceptance | MANUAL OPEN | Actual screen-reader, zoom/text scaling, keyboard-only, touch target, and media interaction checks must be performed on real browser/device environments. |
| Manual cross-device acceptance | MANUAL OPEN | Real phone/tablet/Chromebook browser checks remain required; static CSS/tests do not substitute. |
| Final visual/usability pass | MANUAL OPEN | Confirm no clipping, obscured controls, unusable dialogs, or touch/keyboard regressions in real rendered UI. |
| Final documentation/version reconciliation | GREEN | README and Vault architecture updated on active branch; this matrix is the status authority. Final PR metadata still needs refresh after latest green head. |

## Data / recovery boundary

INF-003 requires automated backups, point-in-time recovery, disaster recovery, validation, recovery testing, and recovery verification at the Kingdom architecture level.

IMP-005 now provides the **verified Vault-domain primitive** needed by later operations:

- consistent authoritative Vault DB snapshot;
- referenced media/evidence snapshot;
- database and file hashes;
- SQLite integrity and foreign-key validation;
- snapshot verification;
- tested restore into a clean target.

The following are **LATER PHASE**, not falsely claimed as complete IMP-005 functionality:

- automated backup scheduling;
- off-site replication;
- retention/rotation policy;
- true point-in-time WAL/log replay infrastructure;
- multi-region/distributed disaster recovery;
- operator recovery dashboards/alerting;
- production incident-response procedures.

These belong to infrastructure/deployment/launch work and must consume the verified recovery primitive rather than inventing a second Vault data model.

## Explicitly not claimed in IMP-005

The following remain **NOT CLAIMED** as current real features:

- live external collectible valuations;
- guaranteed market/sale values;
- real PSA/NGC/JSA/Beckett/etc. certificate verification;
- AI grading;
- photo/image collectible identification;
- barcode/catalog identification providers;
- Marketplace listing publication;
- merchant commerce;
- payments;
- shipping labels/tracking;
- offers/trades/order execution;
- insurance-provider integration;
- production multi-device/offline synchronization.

Future seams may exist, but the product must continue labeling these honestly until their real service/provider implementations are verified.

## Competitive research adopted during IMP-005

Dated records under `docs/research/` document current research into iCollect Everything, Collectr, CollX, hobbyDB, Shelf.nu, HomeBox, CLZ, PriceCharting, Sortly, PSA/NGC/PCGS, StampWorld, and related collector workflows.

Adopted principles include:

- broad multi-category collection support;
- custom metadata rather than category-specific database forks;
- fast search and bounded large-collection paths;
- explicit physical location hierarchy;
- saved views;
- supporting documents and provenance;
- preview-before-commit import behavior;
- recovery discipline;
- advisory AI/assistant suggestions with evidence and collector authority;
- future-ready scan/valuation/commerce seams without fake implementations.

Rejected shortcuts include automatic duplicate merging, fake live valuation, unverified certificate claims, fake Vision/scanning, silent AI record edits, copied AGPL/proprietary source, and architecture rewrites solely to imitate competitors.

## Latest automated verification checkpoints

Verified checkpoints on the active IMP-005 branch include:

- production incremental search switch — CI #188;
- media byte-validation hardening — CI #194;
- Vault recovery snapshot/restore — CI #200;
- accessibility/focus hardening — CI #206 and #208;
- collection-view performance indexes — CI #212;
- grounded tag recommendation core — CI #220;
- authenticated recommendation/Keeper/build wiring — CI #227;
- collector-facing recommendation UI — CI #233;
- bounded duplicate-summary core — CI #235;
- bounded Royal Curator duplicate context and production artifact wiring — CI #240.

A newer documentation-only head must still pass the complete quality gate before it becomes the latest verified checkpoint.

## Merge gate

PR #7 remains **DRAFT**.

Do not mark ready or merge until:

1. the latest branch head passes the complete GitHub Actions quality gate and production dependency audit;
2. manual phone/tablet/Chromebook responsive acceptance is recorded;
3. manual keyboard and screen-reader/assistive-technology acceptance is recorded;
4. any defects found in manual acceptance are fixed and re-verified;
5. PR metadata reflects the final implementation truth and remaining later-phase boundaries;
6. final Construction Document review finds no unresolved IMP-005 requirement that can honestly be completed in this phase.
