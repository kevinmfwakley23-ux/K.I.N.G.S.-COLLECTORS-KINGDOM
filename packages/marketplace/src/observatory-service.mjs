import { MarketplaceError } from "./service.mjs";

const MAX_VERIFIED_LISTINGS = 10_000;
const PAGE_SIZE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

function freezeArray(items) {
  return Object.freeze(items.map((item) => Object.freeze(item)));
}

function askRange(listings) {
  if (!listings.length) {
    return Object.freeze({
      minAskCents: null,
      medianLowAskCents: null,
      medianHighAskCents: null,
      maxAskCents: null
    });
  }
  const amounts = listings.map((listing) => listing.amountCents).sort((a, b) => a - b);
  const lowIndex = Math.floor((amounts.length - 1) / 2);
  const highIndex = Math.ceil((amounts.length - 1) / 2);
  return Object.freeze({
    minAskCents: amounts[0],
    medianLowAskCents: amounts[lowIndex],
    medianHighAskCents: amounts[highIndex],
    maxAskCents: amounts.at(-1)
  });
}

function publicationTime(listing, nowMs) {
  const timestamp = Date.parse(listing.publishedAt ?? "");
  if (!Number.isFinite(timestamp) || timestamp > nowMs) {
    throw new MarketplaceError(
      "marketplace_observatory_invalid_publication_time",
      "The active market contains a listing with an invalid publication time, so Observatory statistics cannot be published safely.",
      500,
      { listingId: listing.id }
    );
  }
  return timestamp;
}

function recentCounts(listings, nowMs) {
  let new24hCount = 0;
  let new7dCount = 0;
  for (const listing of listings) {
    const timestamp = publicationTime(listing, nowMs);
    const age = nowMs - timestamp;
    if (age <= DAY_MS) new24hCount += 1;
    if (age <= 7 * DAY_MS) new7dCount += 1;
  }
  return Object.freeze({ new24hCount, new7dCount });
}

function categoryCounts(listings) {
  const counts = new Map();
  for (const listing of listings) counts.set(listing.category, (counts.get(listing.category) ?? 0) + 1);
  return freezeArray([...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)));
}

function currencyStats(currency, listings, nowMs) {
  const categories = new Map();
  for (const listing of listings) {
    const bucket = categories.get(listing.category) ?? [];
    bucket.push(listing);
    categories.set(listing.category, bucket);
  }
  const categoryPricing = freezeArray([...categories.entries()].map(([category, rows]) => ({
    category,
    listingCount: rows.length,
    ...askRange(rows),
    ...recentCounts(rows, nowMs),
    evidenceKind: "active-asking-prices"
  })).sort((a, b) => b.listingCount - a.listingCount || a.category.localeCompare(b.category)));

  return Object.freeze({
    currency,
    listingCount: listings.length,
    ...askRange(listings),
    ...recentCounts(listings, nowMs),
    medianRepresentation: "middle-rank-range",
    categories: categoryPricing
  });
}

function transactionAvailableListings(transactionService, listings) {
  if (typeof transactionService?.decoratePublicListings !== "function") return listings;
  return transactionService.decoratePublicListings(listings).filter((listing) =>
    listing.availability?.publicSupportCurrent !== false && Number(listing.availability?.availableQuantity ?? listing.quantity) > 0
  );
}

function readVerifiedListings(marketplaceService, transactionService) {
  const listings = [];
  let scannedListings = 0;
  let cursor = null;
  do {
    const page = marketplaceService.browsePage({ pageSize: PAGE_SIZE, cursor: cursor ?? undefined });
    scannedListings += page.listings.length;
    if (scannedListings > MAX_VERIFIED_LISTINGS) {
      throw new MarketplaceError(
        "marketplace_observatory_capacity_exceeded",
        "The active market exceeds the Observatory's verified scan capacity. Partial statistics will not be published.",
        503,
        { maxVerifiedListings: MAX_VERIFIED_LISTINGS }
      );
    }
    listings.push(...transactionAvailableListings(transactionService, page.listings));
    cursor = page.pageInfo?.hasNext ? page.pageInfo.nextCursor : null;
  } while (cursor);
  return Object.freeze({ listings: Object.freeze(listings), scannedListings });
}

export function createMarketplaceObservatoryService({
  marketplaceService,
  transactionService = null,
  now = () => new Date()
} = {}) {
  if (!marketplaceService || typeof marketplaceService.browsePage !== "function") {
    throw new TypeError("Marketplace observatory service requires verified paged Marketplace discovery.");
  }
  if (transactionService && typeof transactionService.decoratePublicListings !== "function") {
    throw new TypeError("Marketplace observatory transaction availability boundary is invalid.");
  }
  if (typeof now !== "function") throw new TypeError("Marketplace observatory now must be a function.");

  function observatory() {
    const verified = readVerifiedListings(marketplaceService, transactionService);
    const listings = verified.listings;
    const generatedAtDate = now();
    const nowMs = generatedAtDate.getTime();
    if (!Number.isFinite(nowMs)) throw new TypeError("Marketplace observatory now must return a valid date.");

    const currencies = new Map();
    for (const listing of listings) {
      const bucket = currencies.get(listing.currency) ?? [];
      bucket.push(listing);
      currencies.set(listing.currency, bucket);
    }

    const currencyGroups = freezeArray([...currencies.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, rows]) => currencyStats(currency, rows, nowMs)));

    return Object.freeze({
      generatedAt: generatedAtDate.toISOString(),
      totalActiveListings: listings.length,
      activeListingCountsByCategory: categoryCounts(listings),
      currencyGroups,
      evidence: Object.freeze({
        kind: "active-asking-prices",
        completedSalesIncluded: false,
        valuationAvailable: false,
        crossCurrencyPriceAggregation: false,
        sellerAskingPricesAreNotMarketValue: true,
        currentLiveVaultSupportRequired: true,
        publishedRepresentationIntegrityRequired: true,
        currentTransactionAvailabilityRequired: Boolean(transactionService),
        zeroAvailableQuantityExcluded: Boolean(transactionService)
      }),
      capacity: Object.freeze({
        complete: true,
        maxVerifiedListings: MAX_VERIFIED_LISTINGS,
        pageSize: PAGE_SIZE,
        scannedListings: verified.scannedListings
      })
    });
  }

  return Object.freeze({ observatory, maxVerifiedListings: MAX_VERIFIED_LISTINGS });
}

export { MAX_VERIFIED_LISTINGS };