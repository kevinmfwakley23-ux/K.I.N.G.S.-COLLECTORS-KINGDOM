# IMP-005 Intake / Import / Scanner Competitive Reconnaissance

**Date:** 2026-09-05  
**Scope:** Royal Vault bulk migration, rapid intake, barcode/camera capture, cross-device workflow, and uncertainty controls.

## Why this research exists

Collector's Kingdom must reduce the work required to move an existing collection into the Royal Vault and to catalog new items afterward. Competitor workflows are useful evidence, but they do not override the Kingdom construction documents, collector authority, privacy rules, or the requirement that the application never present an uncertain identification as fact.

No proprietary competitor source code or visual design is copied. This record captures product patterns and public platform constraints only.

## Competitor observations

### iCollect Everything

Public iCollect material reviewed on 2026-09-05 shows several high-value intake patterns:

- CSV import/migration with source-field mapping;
- barcode / ISBN lookup and live barcode scanning;
- bulk scan and bulk-add workflows;
- per-item progress feedback during large adds;
- image recognition for supported collection types;
- manual entry when automated identification is unavailable;
- broad custom collection support.

Relevant public sources:

- https://www.icollecteverything.com/support/
- https://www.icollecteverything.com/2026/02/23/our-brand-new-website-is-here/
- https://www.icollecteverything.com/importing-from-clz-collectorz-com-into-icollect-everything/

Kingdom improvement direction:

- make JSON/CSV migration directly available in the responsive Vault instead of requiring a separate desktop-only companion workflow;
- persist the preview/review batch server-side so an import is recoverable;
- require explicit duplicate decisions before committing ambiguous rows;
- commit selected rows atomically and make retries idempotent;
- retain rejected rows and reasons in the review instead of obscuring partial failure.

### CLZ / Collectorz

Public CLZ material reviewed on 2026-09-05 shows a useful cross-device scanner pattern: a phone can capture barcodes and place them into a queue that can then be reviewed on the web application.

Relevant public source:

- https://www.collectorz.com/clz-barcode-scanner

Kingdom improvement direction:

- make rapid capture a server-side **Royal Intake Queue** owned by the collector account rather than a device-local list;
- allow phone capture and Chromebook/desktop review against the same queue;
- collapse repeated captures of the same pending identifier into a capture count instead of producing noisy duplicate queue rows;
- never auto-create an authoritative treasure merely because a barcode was captured;
- later catalog adapters should return candidates/evidence for collector review, not silently decide identity.

## Web platform / camera constraints

The web Barcode Detection API (`BarcodeDetector`) remains limited/experimental rather than universally available. Camera APIs and barcode detection require a secure context in supporting browsers.

Relevant public references reviewed:

- MDN BarcodeDetector: https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector
- MDN secure contexts: https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
- MDN MediaDevices.getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

Engineering consequences:

1. Camera scanning must be progressive enhancement, never a requirement for using the Vault.
2. Manual barcode / ISBN / catalog-number entry must always remain available.
3. Camera access must be user initiated and same-origin only.
4. Camera tracks must be stopped when the scanner closes, the page leaves, or visibility changes as appropriate.
5. The application should query supported barcode formats instead of assuming every format exists.
6. The current `Permissions-Policy` keeps camera access disabled until the real scanner is implemented and tested; enabling `camera=(self)` is a deliberate future code change, not a documentation promise.

## Locked Kingdom intake principles

- **Capture is not identification.** A barcode, image, title fragment, or model suggestion is evidence that may narrow candidates; it does not by itself prove the exact collectible or variant.
- **Collector authority remains final.** Automated matches must be presented with source/evidence/confidence and require review before an authoritative Vault record is finalized when ambiguity exists.
- **No blind bulk writes.** Migration data is previewed, validated, duplicate-checked, reviewed, and then committed atomically.
- **No retry duplicates.** Import commits and future queue mutations should be safe to retry when network state is uncertain.
- **Cross-device by account.** Intake queues should live server-side and be owner-scoped so capture can start on a phone and continue on another device.
- **Typed/manual fallbacks stay first-class.** Unsupported speech, camera, or barcode APIs must never lock a collector out of the workflow.
- **Provider independence.** Core Vault identity and captured identifiers must survive a future change of catalog/recognition provider.

## Current implementation influenced by this research

Implemented or under active verification:

- JSON transactional import review batches;
- CSV parsing and direct field mapping in the responsive Vault;
- duplicate review against the existing Vault and within the incoming batch;
- explicit import/skip decisions for ambiguous rows;
- two-hour server-side preview recovery;
- atomic SQLite commit / rollback;
- idempotent import commit retry behavior;
- provenance events recording import batch and source row;
- production artifact checks for the import review modules.

## Next engineering target

After the import review UI passes the full remote quality gate and is recorded in `docs/MISSION-PROGRESS.md`, build the **Royal Intake Queue**:

1. owner-scoped persistent pending intake records;
2. manual identifier capture first;
3. repeated-capture counts and safe de-duplication of the queue itself;
4. responsive phone/Chromebook queue UI;
5. progressive secure camera scanner using `BarcodeDetector` only when supported;
6. manual fallback when camera/barcode APIs are unavailable;
7. explicit conversion of a reviewed intake entry into a draft/new Vault treasure workflow;
8. later external catalog candidate adapters with evidence/confidence rather than unverified automatic matches.
