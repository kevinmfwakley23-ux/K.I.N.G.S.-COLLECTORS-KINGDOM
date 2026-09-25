# Marketplace Saved-Search Change Intelligence — 2026-09-24

## Purpose

Close a buyer-retention gap without pretending Collector's Kingdom already has email, push, SMS, or background notification delivery.

## Current benchmark

### eBay

Current eBay saved-search documentation states that buyers can save recurring searches and receive alerts when newly listed items match. eBay also exposes saved-search notifications through its broader notification system.

Useful product lesson: a saved query becomes substantially more useful when the collector can distinguish newly listed matches from the entire current result set.

Official references reviewed:
- https://www.ebay.com/help/buying/finding-items-managing-purchases/save-search?id=4051
- https://www.ebay.com/help/account/notifications/notifications?id=4203

### Kingdom opportunity

The Kingdom already has stronger truth boundaries than a generic retail alert:
- saved searches are owner-private definitions;
- reruns use the current live Marketplace rather than stored result snapshots;
- current discovery suppresses unsupported and fully reserved inventory;
- publication representations remain integrity checked;
- currencies are not silently converted;
- a matching listing is not a reservation, order, payment, delivery, or ownership transfer.

The improvement should therefore count only newly published offers that still match the saved definition and are currently sellable at the time the collector checks.

## Production design

Each saved search receives a server-owned `last_checked_at` checkpoint.

### Reading is not acknowledgement

Listing or fetching a saved search must not advance the checkpoint. A collector can see how many newly published, currently sellable matches exist without silently dismissing them.

### Explicit acknowledgement

The Street Market's `Check & open live search` action sends an explicit authenticated saved-search update. The server generates the checkpoint time; a browser cannot submit an arbitrary acknowledgement timestamp.

### Definition changes

Changing the saved search filters starts a new evidence window at the server update time. Renaming the search does not dismiss unseen listings.

### Count semantics

`newlyPublishedMatchCount` means:

> The number of active Marketplace listings published after the saved search's last acknowledged checkpoint and no later than the current server check time that match the saved definition and are currently sellable.

It does **not** mean:
- an email, push, or SMS was delivered;
- the listing is reserved for the collector;
- the listing will remain available;
- the price is a market value or appraisal;
- the listing is newly created in the Royal Vault;
- a sale or ownership transfer occurred.

### Reservation-aware behavior

A newly published listing that is fully reserved is not counted while it is unavailable. If the temporary reservation expires before the collector acknowledges the search, it can become a counted buyer opportunity because its publication remains after the last checkpoint and it is now sellable.

Durably held inventory remains excluded by the same sellable-inventory authority used by normal Marketplace discovery.

## Privacy and delivery boundary

Saved-search checkpoints and counts remain authenticated owner-private data.

This phase intentionally does not add:
- email delivery;
- mobile/web push delivery;
- SMS delivery;
- device tokens;
- background notification queues;
- notification-provider credentials;
- fake alert toggles.

The public/API contract continues to report `notificationsAvailable: false`.

## Verification requirements

The slice is not production-ready unless tests prove:
- newly published matching offers increment the count;
- unrelated listings do not increment it;
- reading the panel does not advance the checkpoint;
- explicit acknowledgement advances the checkpoint;
- renaming preserves unseen-listing state;
- changing filters resets the evidence window;
- fully reserved listings are excluded;
- expired temporary holds can become countable while still unseen;
- legacy saved-search tables migrate with a creation-time checkpoint;
- UI and production artifacts continue to state that push/email/SMS alerts are unavailable.
