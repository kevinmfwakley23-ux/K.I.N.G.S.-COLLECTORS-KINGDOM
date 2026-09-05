# K.I.N.G.S. Collector's Kingdom

A place for collectors to keep inventory logs of their treasures, get A.I.-assisted insights on market values and trade values, receive updates on collection value, and participate in an open marketplace for buying and selling collectibles and more.

## Engineering status

This repository is initialized for active development through GitHub and Codex.

## Core engineering rules

- Build real, executable, production-oriented functionality. Do not substitute mock implementations, fake integrations, placeholder success paths, or nonfunctional UI for required behavior.
- Validate changes with the strongest available build, type-check, lint, and test commands before treating work as complete.
- Keep architecture, implementation status, and build instructions documented as the application grows.
- Prefer small, reviewable commits with clear verification evidence.
- Never commit credentials, API keys, access tokens, or other secrets.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared AI-routing core for the K.I.N.G.S. application family. Collector's Kingdom owns collector, vault, marketplace, identity, authorization, and other product-domain rules; it does not duplicate model-provider routing or provider credentials. AI requests are sent server-to-server through the governed K.I.N.G.S. AI app-router contract.

This boundary lets K.I.N.G.S. AI choose among its configured internal/external intelligence routes while Collector's Kingdom remains responsible for authorizing any product action proposed by AI. Browser code must never receive provider API keys or the shared router access token.

## Product direction

The Kingdom is a premium collector-focused experience with an elegant royal visual identity. The primary environment should evoke polished white marble with black and gold veining, modern mansion/castle refinement, and immersive interactive spaces. The marketplace should feel like a living palace or farmers-market-style collector marketplace rather than a generic storefront.

The Keeper is the collector's royal servant and assistant: a lion presented in refined royal butler/servant attire, available throughout the castle and marketplace for questions, guidance, and updates.

Detailed architecture, implementation milestones, and validated commands will be added as the build progresses.
