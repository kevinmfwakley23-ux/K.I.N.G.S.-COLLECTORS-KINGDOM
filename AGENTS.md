# AGENTS.md — K.I.N.G.S. Collector's Kingdom

These instructions apply to the entire repository unless a more specific `AGENTS.md` exists in a subdirectory.

## Mission

Build K.I.N.G.S. Collector's Kingdom as a real-world, production-oriented collector platform. Every implemented feature must be executable and testable. Do not create fake success paths, decorative-only functionality presented as complete, placeholder integrations presented as real, or tests that merely assert mocked success instead of meaningful behavior.

The permanent product and competitive-engineering mission is defined in `docs/MISSION-STATEMENT.md` and is mandatory guidance for every build session.

## Research-before-build rule

Before every meaningful build session or milestone, perform fresh research appropriate to the feature being built. Review current official competitor webpages/documentation, current Google Play/App Store information when relevant, active GitHub implementations, current standards/APIs, and the Kingdom's own locked Construction Documents and code.

Use that research to identify parity gaps, recurring competitor weaknesses, and ideas worth improving. Do not copy incompatible code or proprietary visual design. Adopt only ideas that strengthen the approved Kingdom architecture, and improve them where practical through better trust, reliability, evidence, privacy, accessibility, interoperability, collector control, or AI assistance.

## Working rules

1. Inspect existing architecture, documentation, tests, and current implementation before making changes.
2. Preserve working behavior unless a validated change intentionally replaces it.
3. Prefer incremental, reviewable changes over large unverified rewrites.
4. When introducing an architectural boundary, document its ownership and how it is tested.
5. Keep dependency choices justified and avoid unnecessary packages.
6. Never commit secrets, credentials, tokens, private keys, or production data.
7. Do not mark a milestone complete unless its acceptance criteria have been verified.
8. Do not claim competitive parity from decorative UI, sample data, or unimplemented integrations.
9. Keep Collector's Kingdom domain authority separate from K.I.N.G.S. AI routing/model-provider authority.

## Verification

For every code change, run the strongest relevant checks available in the repository. As the project is scaffolded, maintain explicit commands for:

- dependency installation
- build
- type checking
- linting
- unit tests
- integration tests
- end-to-end tests where applicable

If a required check cannot run, report the exact blocker instead of claiming success.

## Product experience

The UI should feel like an elegant, modern royal estate rather than a generic dashboard: polished white marble, black and gold veining, refined castle/mansion cues, realistic interactive spaces, and a palace-marketplace/farmers-market atmosphere for commerce.

The Keeper is the collector's royal servant and persistent assistant: an upright anthropomorphic lion who walks on two legs in refined royal butler/servant attire and provides questions/answers, guidance, status, and updates throughout the castle and the outdoor Kingdom Street Market.

Castle rooms preserve the white-marble/black-and-gold-vein identity. The Vault is an orderly high-security treasure-vault interior for the collector's physical treasures. The Marketplace is outside the castle as the Kingdom Street Market rather than another interior room.

## Completion standard

A feature is complete only when its implementation, wiring, persistence/integration behavior where required, error handling, and relevant tests are in place and the applicable verification commands pass.
