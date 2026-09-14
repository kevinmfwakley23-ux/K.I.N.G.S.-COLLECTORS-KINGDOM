import test from "node:test";
import assert from "node:assert/strict";
import { createMarketplaceObservatoryService, MAX_VERIFIED_LISTINGS } from "../packages/marketplace/src/observatory-service.mjs";
import { MarketplaceError } from "../packages/marketplace/src/service.mjs";

function listing({ id, category, currency, amountCents, publishedAt }) {
  return Object.freeze({ id, category, currency, amountCents, publishedAt });
}

function pagedMarketplace(listings) {
  return Object.freeze({
    browsePage({ pageSize, cursor } = {}) {
      const start = cursor ? Number(cursor) : 0;
      const size = Number(pageSize) || 100;
      const page = listings.slice(start, start + size);
      const next = start + page.length;
      const hasNext = next < listings.length;
      return Object.freeze({
        listings: Object.freeze(page),
        pageInfo: Object.freeze({ pageSize: size, hasNext, nextCursor: hasNext ? String(next) : null })
      });
    }
  });
}

test("Marketplace Observatory keeps asking-price evidence currency-separated and reports exact middle ranks", () => {
  const rows = [
    listing({ id: "usd-1", category: "Comic Book", currency: "USD", amountCents: 1000, publishedAt: "2026-09-14T05:30:00.000Z" }),
    listing({ id: "usd-2", category: "Comic Book", currency: "USD", amountCents: 3000, publishedAt: "2026-09-13T05:30:00.000Z" }),
    listing({ id: "usd-3", category: "Trading Card", currency: "USD", amountCents: 9000, publishedAt: "2026-09-10T12:00:00.000Z" }),
    listing({ id: "usd-4", category: "Trading Card", currency: "USD", amountCents: 11000, publishedAt: "2026-09-01T12:00:00.000Z" }),
    listing({ id: "eur-1", category: "Comic Book", currency: "EUR", amountCents: 2000, publishedAt: "2026-09-14T04:00:00.000Z" }),
    listing({ id: "eur-2", category: "Comic Book", currency: "EUR", amountCents: 5000, publishedAt: "2026-09-12T04:00:00.000Z" })
  ];
  const service = createMarketplaceObservatoryService({
    marketplaceService: pagedMarketplace(rows),
    now: () => new Date("2026-09-14T12:00:00.000Z")
  });

  const snapshot = service.observatory();
  assert.equal(snapshot.totalActiveListings, 6);
  assert.equal(snapshot.evidence.kind, "active-asking-prices");
  assert.equal(snapshot.evidence.completedSalesIncluded, false);
  assert.equal(snapshot.evidence.valuationAvailable, false);
  assert.equal(snapshot.evidence.crossCurrencyPriceAggregation, false);
  assert.equal(snapshot.evidence.sellerAskingPricesAreNotMarketValue, true);
  assert.equal(snapshot.capacity.complete, true);
  assert.equal(snapshot.capacity.maxVerifiedListings, MAX_VERIFIED_LISTINGS);

  assert.deepEqual(snapshot.activeListingCountsByCategory, [
    { category: "Comic Book", count: 4 },
    { category: "Trading Card", count: 2 }
  ]);
  assert.deepEqual(snapshot.currencyGroups.map((group) => group.currency), ["EUR", "USD"]);

  const usd = snapshot.currencyGroups.find((group) => group.currency === "USD");
  assert.equal(usd.listingCount, 4);
  assert.equal(usd.minAskCents, 1000);
  assert.equal(usd.medianLowAskCents, 3000);
  assert.equal(usd.medianHighAskCents, 9000);
  assert.equal(usd.maxAskCents, 11000);
  assert.equal(usd.new24hCount, 1);
  assert.equal(usd.new7dCount, 3);
  assert.equal(usd.medianRepresentation, "middle-rank-range");

  const eur = snapshot.currencyGroups.find((group) => group.currency === "EUR");
  assert.equal(eur.medianLowAskCents, 2000);
  assert.equal(eur.medianHighAskCents, 5000);
  assert.equal(eur.new24hCount, 1);
  assert.equal(eur.new7dCount, 2);
});

test("Marketplace Observatory refuses partial statistics when verified scan capacity is exceeded", () => {
  const rows = Array.from({ length: MAX_VERIFIED_LISTINGS + 1 }, (_, index) => listing({
    id: `listing-${index}`,
    category: "Trading Card",
    currency: "USD",
    amountCents: index + 1,
    publishedAt: "2026-09-14T00:00:00.000Z"
  }));
  const service = createMarketplaceObservatoryService({
    marketplaceService: pagedMarketplace(rows),
    now: () => new Date("2026-09-14T12:00:00.000Z")
  });

  assert.throws(
    () => service.observatory(),
    (error) => error instanceof MarketplaceError
      && error.code === "marketplace_observatory_capacity_exceeded"
      && error.statusCode === 503
  );
});

test("Marketplace Observatory fails closed on invalid or future publication evidence", () => {
  const service = createMarketplaceObservatoryService({
    marketplaceService: pagedMarketplace([
      listing({ id: "future", category: "Comic Book", currency: "USD", amountCents: 1000, publishedAt: "2026-09-15T00:00:00.000Z" })
    ]),
    now: () => new Date("2026-09-14T12:00:00.000Z")
  });

  assert.throws(
    () => service.observatory(),
    (error) => error instanceof MarketplaceError
      && error.code === "marketplace_observatory_invalid_publication_time"
      && error.statusCode === 500
  );
});
