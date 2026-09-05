# IMP-005 Research — Sports-Card Certification Evidence

**Date:** 2026-09-05  
**Scope:** PSA certification-number verification, sports-card catalog/price provider access, licensing, and truthfulness boundaries for the Royal Vault.

## Sources reviewed

- PSA Public API documentation: https://www.psacard.com/publicapi/documentation
- PSA Cert Verification security notice: https://www.psacard.com/cert
- SportsCardsPro API / CSV documentation: https://www.sportscardspro.com/api-documentation
- SportsCardsPro Terms of Service: https://www.sportscardspro.com/page/terms-of-service
- SportsCardsPro Price Guide Terms: https://www.sportscardspro.com/page/guide-terms-of-service

## PSA findings

PSA currently documents a Public API served over HTTPS at `https://api.psacard.com/publicapi/`. API use requires a PSA-generated access token supplied through an `Authorization: bearer <access token>` request header. The documented public API currently offers Cert Verification for single-item searches by certification number.

The Kingdom therefore keeps the PSA token server-side only. Browser code never receives the token and never calls the authenticated API endpoint directly. The server may expose the normal public PSA certification page as source evidence after a lookup.

PSA certification responses can carry structured provider data associated with the supplied certification number, including PSA and/or PSA/DNA records. Useful review evidence can include certification number, year, brand/category, card number, subject, variety, PSA grade description/card grade, signer fields, population fields, item status, and PSA/DNA authentication-result metadata where present.

### Critical authenticity boundary

PSA's public Cert Verification security notice explicitly warns that certification-number verification does not eliminate counterfeit risk. PSA notes that criminals can counterfeit grading inserts using real certification numbers from public sources and states that database access confirms data associated with a certification number; it does not mean PSA has viewed or guaranteed that a particular item shown to a buyer is the genuine PSA-authenticated item.

Therefore the Kingdom models a successful PSA lookup as:

- `evidenceClass: certification-database-record`;
- `certificationNumberVerifiedInDatabase: true`;
- `physicalItemAuthenticated: false`.

A successful lookup must not automatically set or overwrite treasure identity, grade, condition, authenticity, provenance, ownership, purchase price, market value, or transaction state. The collector must compare returned certification metadata with the physical holder and other evidence.

PSA certification numbers are also kept as their own Intake evidence identifier type rather than being silently treated as the manufacturer's catalog number, serial number, or permanent Kingdom treasure identity.

## SportsCardsPro / PriceCharting findings

SportsCardsPro documents a sports-card API and downloadable CSV data. Current API access requires a paid subscription and a private subscription token. Its API documentation states a limit of one API call per second, with CSV requests limited to one every ten minutes. The API includes sports-card product/set identity fields but is primarily a price-data product and exposes current values across graded and ungraded conditions.

SportsCardsPro's current Terms of Service state that its Price Data is proprietary. Internal business use requires the applicable subscription, while software, applications, or systems accessible to third parties cannot use/share the Price Data without express written permission. The separate price-guide terms likewise prohibit redistribution without express written consent.

### Kingdom integration decision

The Kingdom will **not** make SportsCardsPro price data a default shared dependency and will not copy its price guide into user-visible valuation features without the required permission/licensing.

If SportsCardsPro is integrated later, the adapter must be permission-aware and opt-in, keep credentials server-side, obey its published traffic limits, and separate catalog identity metadata from price/valuation authority. A catalog match must not silently become a Kingdom market value, physical parallel identification, grade, or authenticity claim.

This decision does not rule out a future properly licensed SportsCardsPro adapter. It prevents the current build from depending on rights or redistribution permissions that have not been established.

## Architecture decision for this slice

The next production slice is PSA certification-database evidence behind the existing provider-neutral review-only evidence service. It does not create a second identity system and does not create a grading-company authority inside the Vault.

Implementation requirements:

1. exact `psa-cert` lookup only;
2. HTTPS outside local tests;
3. PSA bearer token stored only in server runtime configuration;
4. bounded timeout and response size;
5. serialized conservative request pacing;
6. explicit no-data, invalid request, unauthorized-token, rate-limit, upstream, malformed-payload, and cert-mismatch behavior;
7. allowlisted certification metadata only; provider estimates/sales/pricing excluded;
8. short provider-specific cache TTL so cert status/evidence is not treated as long-lived catalog metadata;
9. Royal Intake support for PSA certification numbers;
10. no alias from PSA cert number to ordinary catalog/serial identity;
11. responsive database-evidence display with public PSA source link;
12. no automatic treasure-editor, grade, condition, authenticity, provenance, ownership, or valuation handoff.

## Later research targets

After PSA is verified, research other grading-company verification sources (for example BGS, SGC, CGC and others) only against their current official access methods and terms. Separately research a sports-card catalog-identity provider that can be used legally without conflating identification with proprietary market-price redistribution.
