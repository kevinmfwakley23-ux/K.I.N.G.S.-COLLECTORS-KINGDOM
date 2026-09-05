# K.I.N.G.S. Collector's Kingdom — Official Brand & Install Surface Research

Date: 2026-09-05

## Owner-locked brand direction

The supplied K.I.N.G.S. Collector's Kingdom crest is the canonical Kingdom artwork. It is not to be redrawn, substituted with a generic crown, or replaced with a different lion/crest composition.

The product experience remains:

- polished white marble;
- restrained black and gold veining;
- modern royal estate / castle language;
- the crest at high-visibility entry and navigation surfaces;
- the same brand identity inside castle rooms and outside in the Kingdom Street Market;
- The Keeper remaining a separate lion-butler character rather than becoming the product logo.

The repository asset at `apps/web/public/assets/kingdom-official-logo.svg` is derived directly from the approved owner artwork for web display. It preserves the approved composition rather than inventing a new mark.

## Installable web-app decision

The current Kingdom runtime is a Node-backed web application, so the immediate install surface is a standards-based progressive web app rather than pretending that an Android APK already exists.

Implemented boundaries:

- manifest uses the approved crest as the install icon;
- `display: standalone` provides app-like launch behavior where supported;
- install prompting is progressive and does not block normal browser use;
- the service worker caches only static same-origin application assets;
- `/api/` requests are explicitly excluded from service-worker caching;
- document navigations are explicitly excluded from service-worker caching;
- authentication, Vault records, grading evidence, and other owner data are therefore not turned into an offline cache by this install slice.

## Android launcher research

Current Android guidance treats launcher icons as adaptive assets rather than a single arbitrary square image. Android's official adaptive-icon guidance requires separate foreground/background layers for the color icon and supports a monochrome layer for themed icons. It also documents the inner safe zone that remains visible across OEM masks.

Engineering consequence for the Kingdom:

- do **not** declare the full rectangular crest artwork `maskable` just to make an icon test turn green;
- preserve the canonical crest artwork for splash, login, header, and other full-art surfaces;
- when the native Android wrapper is added, derive an adaptive-icon package from the canonical artwork with the central lion/crown identity placed safely inside Android's guaranteed area;
- retain a gold/black/white background layer consistent with the Kingdom UI;
- add a monochrome layer for themed launcher support;
- keep the complete approved crest available in-app even when the launcher icon must use a technically safe crop/layer treatment.

Official Android reference reviewed: Android Developers, **Adaptive icons**, updated 2026-08-13.

## Competitive product research

Current collector products continue to concentrate on fast scan-to-catalog-to-price-to-sale workflows:

- Ludex markets photo scanning, card identification, recent-sales pricing, portfolio organization, custom collections/decks, and direct eBay listing. Its web collection product also emphasizes real-time price tracking, lists, CSV ownership/export, and synchronized collection management.
- CollX emphasizes photo recognition, portfolio value, buying/selling/grading/trading, and a Marketplace `Deal` workflow that can combine multiple items with buy-now, offers, accept/reject, and counteroffers.

Kingdom adaptation rule:

- match useful workflow speed without copying proprietary scoring, protected datasets, or visual design;
- keep the Kingdom's stronger evidence/truthfulness boundary: identification candidates, pre-grades, market values, provenance statements, and authentication evidence stay distinguishable from verified facts;
- preserve portable collection ownership and explicit collector approval before authoritative mutations;
- later Marketplace work should evaluate multi-item deal negotiation and seller controls as a real parity target, while adding Kingdom-owned provenance/ownership-transfer safeguards rather than merely cloning another marketplace.

Sources reviewed this session:

- Android Developers — Adaptive icons: https://developer.android.com/develop/ui/compose/system/icon_design_adaptive
- Ludex — current product: https://www.ludex.com/
- Ludex — collection web experience: https://collections.ludex.com/
- CollX — current product: https://collx.app/
- CollX — Marketplace FAQ: https://collx.app/marketplace-faq

## Next native-app requirement

This slice does **not** claim a downloadable APK. A real APK requires a separately verified Android client/wrapper, secure remote Kingdom runtime access, Android signing/build configuration, adaptive launcher resources, deep-link/session handling, and device verification. Those should be built as an explicit native-distribution milestone rather than hidden behind a web manifest.
