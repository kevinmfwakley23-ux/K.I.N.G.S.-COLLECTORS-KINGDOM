# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging and locating treasures, preserving ownership/provenance records, receiving evidence-backed intelligence, and eventually buying, selling, trading, discovering, and protecting collectibles through the wider Kingdom.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified checkpoint:** the Royal Vault now has persistent owner-scoped treasure records, secure private media, Kingdom voice command/talk-to-text, transactional JSON/CSV migration, and a cross-device **Royal Intake Queue** for rapid identifier capture and later review.

Latest verified code gate: **Kingdom Quality Gates #347** — run `33959303126` — **PASS** on commit `58c60d605e107bdaeeaa5300b1de0c3fea164cfb`.

The next engineering target is the **secure progressive barcode-camera scanner** on top of the verified Intake Queue. Camera scanning remains disabled until that implementation is real and tested. External catalog matching, image recognition, evidence-backed valuation, and Marketplace mutations are not yet represented as live.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent engineering mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — exact recoverable build state, verification evidence, limitations, and next target.
- [`docs/research/`](docs/research/) — dated competitor, GitHub, standards, API, and technical reconnaissance used before meaningful build work.

After every substantial implementation milestone, `docs/MISSION-PROGRESS.md` must be updated so development can resume from the repository rather than depending on a chat session.

## Permanent engineering rules

- Build real, executable, production-oriented functionality; do not present simulated integrations or decorative-only interfaces as complete features.
- Verify changes with the strongest available lint, contract, automated-test, production-build, artifact, and dependency-audit gates.
- Never fabricate collection totals, market values, Marketplace activity, notifications, identification certainty, or other domain data when no authoritative service exists.
- Never commit credentials, provider keys, access tokens, or secrets.
- Keep collector authority over destructive or ownership-changing actions.
- AI assistance must surface uncertainty rather than silently inventing an identification, value, provenance claim, or exact variant.
- Prefer portable data and provider-independent permanent Kingdom identities.
- Keep mobile, Chromebook, tablet, and desktop workflows first-class.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared intelligence/router core for the K.I.N.G.S. application family. Collector's Kingdom owns collector identity, authorization, Vault records, Marketplace rules, ownership state, and product actions. AI model/provider routing remains behind the governed server-to-server K.I.N.G.S. AI boundary, and provider credentials never belong in browser code.

The Keeper can advise through K.I.N.G.S. AI, but Kingdom record mutations remain explicitly authorized by Collector's Kingdom and the collector.

## Great Hall

IMP-004 established the authenticated central Kingdom experience:

- personalized Great Hall;
- permanent castle-and-grounds geography;
- Royal Vault inside the castle;
- Kingdom Street Market outside the castle;
- real recent account activity;
- honest service availability states;
- quick actions;
- persistent room-aware Keeper;
- responsive royal-estate UI.

With the authoritative Vault wired, the Great Hall exposes `/vault.html` and reports real Vault record/unit counts instead of sample data.

## Royal Vault — verified capability

The Vault establishes one permanent treasure identity that later services can reuse rather than duplicating item records.

Current verified capability includes:

- owner-scoped treasure create/read/update/archive;
- collection groups;
- arbitrary-depth storage locations such as room → safe → shelf → binder → page → pocket;
- condition, variant, quantity, acquisition, cost, identifiers, descriptions, notes, and custom attributes;
- normalized accent-tolerant search/filter/sort;
- duplicate candidate detection without automatic destructive merging;
- treasure/media history;
- real record/unit/category statistics;
- purchase totals separated by currency;
- complete versioned JSON export including archived records;
- Great Hall integration using real Vault counts;
- responsive Royal Vault browser workspace;
- The Keeper acting as Royal Curator.

### Secure treasure media

Verified private-media support includes JPEG, PNG, WebP, GIF, AVIF, and PDF files stored outside the public webroot with generated storage keys, signature/MIME/extension checks, owner authorization, storage limits, private retrieval, deletion, and audit events.

### Voice command and talk-to-text

Where the browser supports speech recognition, the Kingdom provides user-initiated voice commands and dictation while keeping full typed fallback.

Supported safe command classes include:

- Kingdom navigation such as “open the Vault”;
- “call the Keeper” / “ask the Keeper…”;
- spoken search;
- “add a treasure”.

Dictation is available for Keeper messages, Great Hall/Vault search, and relevant treasure text fields. Destructive voice commands such as delete/archive/sell/buy/transfer are deliberately not executable. Microphone access is same-origin only.

### Transactional JSON / CSV migration

The Vault supports direct responsive migration rather than a blind bulk-write endpoint:

- JSON input;
- CSV file/paste input;
- common collector-column inference;
- explicit CSV field mapping;
- custom-attribute preservation;
- server-side two-hour review batches;
- validation before writes;
- existing-Vault and within-file duplicate detection;
- explicit Import/Skip decisions for ambiguous rows;
- stale-preview revalidation;
- owner isolation;
- idempotent commit retry behavior;
- one SQLite transaction for selected treasure + provenance-event writes;
- proven full rollback on mid-batch failure;
- recovery of an unfinished review from the same browser session.

### Royal Intake Queue

The verified cross-device intake workflow lets a collector capture identifiers quickly without turning uncertain evidence into false authoritative records:

- manual barcode, UPC, EAN, ISBN, catalog, serial, SKU, or custom-identifier capture;
- owner-scoped server-side pending queue shared across signed-in devices;
- repeated pending captures merged into one queue entry with a capture count;
- exact existing-Vault identifier candidates shown as warnings, not automatic identity decisions;
- pending/history views;
- soft dismissal with preserved history;
- responsive phone/Chromebook/desktop UI;
- one-click identifier handoff into a new treasure editor while keeping the queue entry pending until explicitly dismissed;
- audit events for capture/dismissal;
- camera intentionally unavailable until the scanner milestone passes its own security and quality gates.

Fresh intake/import/scanner research is recorded in [`docs/research/2026-09-05-IMP-005-INTAKE-IMPORT-SCANNER-RECON.md`](docs/research/2026-09-05-IMP-005-INTAKE-IMPORT-SCANNER-RECON.md).

## Product direction

The Kingdom uses a premium royal-estate identity: polished white marble, black and gold veining, elegant modern castle/mansion organization, and immersive spaces without dashboard clutter.

The Royal Vault is a grand high-security collection environment. The Marketplace District is the **Kingdom Street Market** outside the castle, designed as a refined open-air collector market rather than a generic storefront grid.

The Keeper is the same upright anthropomorphic lion royal attendant throughout the product, adapting by location: Royal Host, Royal Curator, Royal Trade Advisor, and other role-appropriate forms without losing character continuity.

## Verification

```bash
npm ci
npm run verify
```

`npm run verify` runs repository policy/syntax checks, module-contract checks, automated tests, the production build, and artifact verification. GitHub Actions additionally audits production dependencies and is the required remote quality gate before a major checkpoint is treated as verified.
