# Multi-Category Collector Recon — 2026-09-04

Status: Active engineering research record
Authority: Construction Documents remain binding; external research is subordinate.

## Locked Construction-Document direction

PRD-002 and IMP-005 establish the Royal Vault as the permanent authoritative home for every collectible. The architecture must remain flexible rather than prescriptive and support future expansion without redesign. Organization must be able to use category, series, publisher/manufacturer, player, character, artist, year, set, collection, tags, custom folders, and saved searches. Treasure records must preserve ownership history and be ready for future grading, authentication, Marketplace, AI grading, insurance, and Legacy capabilities.

This research pass therefore does not replace the locked design. It strengthens the implementation underneath it.

## Collector scope confirmed by product owner

The Vault must comfortably support, at minimum:

- Funko Pops and vinyl figures
- Sports cards
- Trading Card Games (TCG)
- Hot Wheels and other die-cast vehicles
- Comic books
- Action figures
- Stamps and postal collectibles
- Coins, currency, and other lawful legal tender collectibles
- Film and movie memorabilia
- Sports memorabilia
- Autographed and signed items
- Music memorabilia

The architecture must also continue to admit custom categories and additional lawful collectible families without a migration or redesign.

Adjacent category profiles included now because they use the same extensible architecture:

- Video games and consoles
- Records and music media
- Historical memorabilia
- LEGO and building sets
- Tickets and event memorabilia
- Other/custom collectibles

## Current competitive signals reviewed

### hobbyDB / Pop Price Guide
Useful ideas:
- broad collectible database rather than a single-card silo
- barcode/image-assisted research
- collection value and gain/loss concepts
- showcases/wishlists
- buy/sell/trade adjacency
- price points tied to identifiable sources

Kingdom improvement:
- collection stewardship is not paywall-dependent architecture
- precise physical-location hierarchy
- source/evidence status separated from collector-entered facts
- one resident AI steward across collection, market, knowledge, and legacy workflows

### CollX
Useful ideas:
- fast photo intake for sports and TCG cards
- player/team/year/condition/value filtering
- portfolio tracking
- community and transaction workflows
- graded/rookie/autograph/memorabilia facets

Kingdom improvement:
- category system is not card-centric
- false recognition is never silently accepted as truth
- duplicate candidates are advisory and never auto-merged
- preview-first imports and evidence-aware metadata
- physical storage and provenance are first-class

### CLZ Comics
Useful ideas:
- barcode/cover scanning
- issue/variant-level detail
- creator/character metadata
- storage-box information
- grade, grading company, signature, slab/cert information
- custom fields and multiple images

Kingdom improvement:
- those metadata ideas become a reusable category-intelligence system, not a comic-only schema
- verification status remains separate from entered cert references
- same Vault record can feed Keeper, Marketplace, Observatory, Treasury, and Legacy later

### PCGS / NGC / PSA
Useful ideas:
- certification lookup
- population and grade context
- auction-realized history
- photo/grade comparison
- autograph authentication
- memorabilia photo matching and provenance support

Kingdom improvement:
- collector-entered certification data is never presented as externally verified
- future provider integrations promote verification only after real provider checks
- provider-independent verification architecture where practical

### StampWorld
Useful ideas:
- country/thematic organization
- large catalog search
- personal albums
- values, marketplace, and collector discovery

Kingdom improvement:
- exact physical storage and flexible custom metadata coexist with catalog organization
- stamps remain one category profile in a unified Vault rather than a separate product

### iCollect Everything
Useful ideas:
- many built-in collection types
- purpose-built templates
- manual entry plus lookup/scanning
- custom collections
- bulk add and rich field types

Kingdom improvement:
- category profiles suggest fields without restricting category names
- one extensible metadata service supports every profile
- profile changes do not alter the authoritative core treasure schema
- trust/provenance/verification distinctions remain explicit

## Adopted engineering decisions

1. **Category is collector-owned text.** Recommended profiles assist; they do not form a restrictive enum.
2. **Category intelligence is centralized.** `packages/vault/src/taxonomy.mjs` owns current profiles, aliases, and recommended fields.
3. **Specialized metadata is extensible.** `packages/vault/src/attributes.mjs` stores per-treasure details without a category-specific table explosion.
4. **Verification cannot be self-asserted.** Collector-editable metadata remains `not-checked`; a future real verifier must promote its verification state.
5. **Provenance and audit remain separate.** Ownership history describes the collectible's story; audit history describes database actions.
6. **Bulk intake remains preview-first.** Recognition/import warnings never cause silent merging or silent truth changes.
7. **Physical location remains universal.** Every category can use the same room/safe/cabinet/display/shelf/binder/page/pocket/box/row/container hierarchy.
8. **Future room reuse is mandatory.** Category details must later be usable by The Keeper, Marketplace, Library, Observatory, War Room, Treasury, Workshop, and Hall of Legacy without duplicate data entry.

## Current category-specific examples

- Sports cards: sport, player, team, set, card number, parallel/variant, serial, rookie, grade, grader, cert.
- TCG: game, set, card number, character, rarity, finish, language, edition, grade/cert.
- Funko: franchise, character, figure number, product line, exclusive, chase, sticker, box condition, grade/cert.
- Hot Wheels/die-cast: brand, vehicle, casting, series, scale, colorway, collector number, Treasure Hunt type, packaging.
- Comics: series, issue, volume, publisher, writer, artist, cover artist, character, variant, key issue, signed by, slab/cert.
- Action figures: franchise, character, line, manufacturer, scale, variant, exclusive, sealed, packaging, accessories completeness.
- Stamps: country/issuer, catalog number, issue date, denomination, currency, printing, perforation, watermark, gum, cancellation, motif.
- Coins/currency: country/issuer, denomination, currency, mint, mint mark, variety, composition, weight, grade, grader, cert, population, mintage.
- Film/movie memorabilia: production, performer, character, item role, screen/production use, scene reference, studio, authenticator, cert/LOA, provenance.
- Sports memorabilia: sport, athlete, team, season, event, item type, game-used/game-worn, photo-match, authenticator, cert, provenance.
- Autographs: signer, signature count, signing date/place, inscription, in-person/witnessed status, authenticator, cert/LOA.
- Music memorabilia: artist/band, tour, event, venue/date, item type, signer, authenticator, cert, provenance.

## Rejected shortcuts

- hard-coding all collectibles into one card-style field set
- creating a different database/table family for each category
- claiming cert/authentication validity from a typed certificate number alone
- hiding uncertain recognition behind a confident UI label
- auto-merging possible duplicates
- flattening physical locations to one free-text box
- making custom categories second-class or unsupported

## Next category-aware work

- complete visible category-detail editor in treasure detail view
- index selected category-specific details into Universal Search without weakening isolation
- expose bounded category details to The Keeper as Royal Curator
- design real provider verification adapters separately from collector editing
- prepare grading/authentication and supporting-document records for later phases without claiming those services exist before they do
