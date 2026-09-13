import test from "node:test";
import assert from "node:assert/strict";
import { createEbayBrowseValuationProvider } from "../packages/vault/src/ebay-browse-valuation-provider.mjs";

const NOW = new Date("2026-09-12T20:00:00.000Z");

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return body; }
  };
}

test("eBay Browse provider uses application OAuth, caches its token, and emits asking observations only", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/identity/v1/oauth2/token")) {
      return jsonResponse({ access_token: "app-token", expires_in: 7200 });
    }
    return jsonResponse({
      itemSummaries: [
        {
          itemId: "v1|123|0",
          title: "1986 Fleer Michael Jordan #57",
          price: { value: "250.00", currency: "USD" },
          condition: "Ungraded - Near Mint or Better",
          itemWebUrl: "https://www.ebay.com/itm/123"
        },
        {
          itemId: "v1|456|0",
          title: "1986 Fleer Michael Jordan #57 PSA 10",
          price: { value: "8500.50", currency: "USD" },
          condition: "Graded",
          itemWebUrl: "https://www.ebay.com/itm/456"
        },
        {
          itemId: "v1|bad|0",
          title: "Incomplete listing",
          price: { value: "15.00", currency: "USD" },
          itemWebUrl: "https://www.ebay.com/itm/bad"
        }
      ]
    });
  };

  const provider = createEbayBrowseValuationProvider({
    clientId: "client-id",
    clientSecret: "client-secret",
    policyId: "ebay-browse-policy-reviewed-2026-09-12",
    marketplaceId: "EBAY_US",
    fetchImpl,
    now: () => NOW
  });

  const treasure = {
    title: "1986 Fleer Michael Jordan #57",
    manufacturer: "Fleer",
    series: "Basketball",
    variant: null
  };

  const first = await provider.observeTreasure({ treasure, limit: 10 });
  const second = await provider.observeTreasure({ treasure, limit: 10 });

  assert.equal(provider.id, "ebay-browse");
  assert.deepEqual(provider.observationTypes, ["asking-listing"]);
  assert.equal(first.providerPolicyId, "ebay-browse-policy-reviewed-2026-09-12");
  assert.equal(first.retrievedAt, NOW.toISOString());
  assert.equal(first.observations.length, 2);
  assert.equal(first.rejectedCount, 1);
  assert.equal(second.observations.length, 2);

  const raw = first.observations[0];
  assert.equal(raw.observationType, "asking-listing");
  assert.equal(raw.providerObservationId, "v1|123|0");
  assert.equal(raw.amountCents, 25000);
  assert.equal(raw.currency, "USD");
  assert.equal(raw.itemState, "raw");
  assert.equal(raw.conditionLabel, "Ungraded - Near Mint or Better");
  assert.match(raw.notes, /Asking price only/);

  const graded = first.observations[1];
  assert.equal(graded.amountCents, 850050);
  assert.equal(graded.itemState, "graded");
  assert.equal(graded.gradingCompany, "PSA");
  assert.equal(graded.gradeLabel, "10");

  const tokenCalls = calls.filter((call) => call.url.endsWith("/identity/v1/oauth2/token"));
  const browseCalls = calls.filter((call) => call.url.includes("/buy/browse/v1/item_summary/search"));
  assert.equal(tokenCalls.length, 1, "application token should be cached while valid");
  assert.equal(browseCalls.length, 2);
  assert.match(tokenCalls[0].options.headers.Authorization, /^Basic /);
  assert.equal(browseCalls[0].options.headers.Authorization, "Bearer app-token");
  assert.equal(browseCalls[0].options.headers["X-EBAY-C-MARKETPLACE-ID"], "EBAY_US");
  assert.match(browseCalls[0].url, /q=1986\+Fleer\+Michael\+Jordan/);
});

test("eBay Browse provider fails closed when OAuth or Browse access is rejected", async () => {
  const tokenRejected = createEbayBrowseValuationProvider({
    clientId: "client-id",
    clientSecret: "client-secret",
    policyId: "policy-1",
    fetchImpl: async () => jsonResponse({ error: "invalid_client" }, 401),
    now: () => NOW
  });

  await assert.rejects(
    () => tokenRejected.observeTreasure({ treasure: { title: "Test card" } }),
    (error) => error?.code === "valuation_provider_unavailable" && error?.statusCode === 502
  );

  let call = 0;
  const browseRejected = createEbayBrowseValuationProvider({
    clientId: "client-id",
    clientSecret: "client-secret",
    policyId: "policy-1",
    fetchImpl: async () => {
      call += 1;
      if (call === 1) return jsonResponse({ access_token: "token", expires_in: 7200 });
      return jsonResponse({ errors: [{ errorId: 1100 }] }, 403);
    },
    now: () => NOW
  });

  await assert.rejects(
    () => browseRejected.observeTreasure({ treasure: { title: "Test card" } }),
    (error) => error?.code === "valuation_provider_unavailable" && error?.details?.statusCode === 403
  );
});
