# IMP-002 Foundation Architecture

## Status

Implemented foundation slice. This document does not mark IMP-002 complete until CI and repository-level quality gates have passed.

## Purpose

This foundation establishes an executable, dependency-light runtime for K.I.N.G.S. Collector's Kingdom while preserving the locked architectural requirements: modular boundaries, centralized backend behavior, observable services, accessible responsive frontend behavior, secure defaults, and framework adaptability.

## Current boundaries

- `apps/web` owns the HTTP application boundary and static foundation page.
- `packages/core` owns product-neutral Kingdom runtime contracts such as health/readiness state.
- `packages/observability` owns structured operational logging.
- `config` owns validated runtime configuration.
- `tools` owns build and repository verification automation.
- `tests` owns cross-boundary automated verification.

No collector-facing room is represented as complete in this phase.

## Runtime

Node.js 22+ is the only runtime dependency in this first slice. There are no third-party production packages yet. This makes the bootstrap runnable on Chromebook/Linux ARM64 and ordinary desktop/server environments while keeping future framework selection open.

### Local commands

```bash
npm ci
npm run dev
npm test
npm run verify
npm run build
npm run start:prod
```

Default local address: `http://127.0.0.1:8788`.

Operational endpoints:

- `GET /health` — liveness and version information.
- `GET /ready` — readiness checks.
- `GET /api/meta` — honest build-phase metadata.

## Security baseline

The runtime validates configuration, rejects unsupported HTTP methods, prevents static path traversal, emits conservative browser security headers, avoids stack traces in HTTP responses, and uses structured logs. CI includes dependency auditing. Authentication and authorization are intentionally deferred to IMP-003 rather than imitated here.

## Build artifact

`npm run build` creates `dist/` containing the runnable application, configuration, internal packages, and a build manifest. `npm run start:prod` starts that artifact.

## Next locked phase

After IMP-002 is fully verified, the next implementation phase is IMP-003 Authentication & User System. Great Hall feature implementation follows authentication rather than bypassing the locked construction sequence.
