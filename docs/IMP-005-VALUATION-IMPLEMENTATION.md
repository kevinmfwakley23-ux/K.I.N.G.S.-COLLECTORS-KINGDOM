# IMP-005 — Evidence-Backed Valuation Foundation

## Status

**Integrated and verified on `main`.**

- PR #22 final head `9e218849d657373cfe8a9564f3114defbfbd710a` — Kingdom Quality Gates **#657** / run `34672939698` — PASS.
- Squash merge commit `5addf3d483e978c79028ff00812d8beca08b9661` — Kingdom Quality Gates **#658** / run `34672966858` — PASS on exact `main` head.

The verification chain covers exact dependency installation, canonical `npm run verify`, automated regression/integration tests, production build/artifact verification, and the production dependency audit.

## What this increment adds

- append-only, owner-scoped comparable evidence storage;
- sold-comparable versus asking-listing distinction;
- source URL/reference, observed date, currency, item-state, condition and grade context;
- SHA-256 evidence integrity verification;
- linked append-only corrections instead of destructive evidence edits;
- 180-day recent-sale window;
- three-recent-sold-comparable minimum before an estimate appears;
- median-based estimate with low/high range, sample count, source count and evidence-strength label;
- strict separation of currency and condition/grade buckets;
- asking-listing exclusion from computed estimates;
- authenticated HTTP API and collector-facing Vault panel;
- valuation evidence in collector Vault export;
- unit, server-integration and browser-contract tests;
- type-contract and production-artifact gates covering the new runtime surfaces.

## Truth boundary

This increment does **not** claim an independent appraisal, guaranteed sale price, verified marketplace authenticity, licensed automatic commercial-price feed, or automatic third-party market truth. The initial evidence class is `collector-recorded-comparable` and each exposed record states `independentlyVerified: false`.

The authoritative treasure identity is not rewritten by valuation. Acquisition and realized-sale facts remain provenance events. Valuation evidence is a separate append-only ledger and estimates are derived read models.

## Verification command

The repository authority remains:

```bash
npm run verify
```

Every future valuation change must pass Kingdom Quality Gates on the exact integration head before it is treated as production truth.