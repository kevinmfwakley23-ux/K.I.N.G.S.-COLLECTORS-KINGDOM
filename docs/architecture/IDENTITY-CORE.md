# IMP-003 Identity Core

## Status

Implemented and testable sub-slice of IMP-003. IMP-003 is not complete yet.

## Implemented

- Persistent collector accounts and profiles.
- Scrypt password hashing with per-password random salts.
- Opaque, server-side, expiring sessions stored only as SHA-256 token hashes.
- HttpOnly, SameSite=Strict session cookies; Secure can be required by deployment configuration.
- Sign-in, sign-out, session restoration, active-session listing, profile update, and role enforcement boundaries.
- Collector/merchant/administrator role schema with collector default.
- Audit records for registration, successful/failed sign-in, sign-out, and profile updates.
- Functional registration/sign-in browser interface.
- Fail-closed readiness when the identity service is not wired.

## Storage

This slice uses the built-in `node:sqlite` adapter so the application has real durable storage without native third-party packages. The identity service is kept behind a storage boundary so a horizontally scalable database adapter can replace it without changing identity business rules. The current SQLite adapter is suitable for local/single-node execution; it is not evidence that the full scale/high-availability acceptance criteria for INF-001 are complete.

## Remaining IMP-003 work

Password recovery, email verification, MFA enrollment/challenge, trusted-device lifecycle, privacy/security settings, notification delivery integration, administrative provisioning workflows, abuse throttling, and production-scale database deployment remain required before IMP-003 can be marked complete.
