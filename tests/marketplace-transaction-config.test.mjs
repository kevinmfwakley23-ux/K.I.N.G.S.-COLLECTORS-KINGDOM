import test from "node:test";
import assert from "node:assert/strict";
import { loadMarketplaceTransactionConfig } from "../config/marketplace-transactions.mjs";

test("Marketplace transaction config is fail-closed by default", () => {
  const config = loadMarketplaceTransactionConfig({});
  assert.equal(config.stripeConfigured, false);
  assert.equal(config.checkoutRequested, false);
  assert.equal(config.checkoutEnabled, false);
  assert.equal(config.automaticTaxEnabled, false);
  assert.equal(config.taxPolicyId, null);
  assert.equal(config.platformFeeBps, 0);
  assert.equal(config.publicBaseUrl, "http://127.0.0.1:8788");
  assert.deepEqual(config.shippingCountries, ["US"]);
});

test("Marketplace transaction config requires the complete Stripe Connect secret set", () => {
  assert.throws(
    () => loadMarketplaceTransactionConfig({ KINGDOM_STRIPE_SECRET_KEY: "sk_test_only" }),
    /STRIPE_SECRET_KEY.*STRIPE_WEBHOOK_SECRET.*STRIPE_CONNECT_POLICY_ID/i
  );
  assert.throws(
    () => loadMarketplaceTransactionConfig({
      KINGDOM_STRIPE_SECRET_KEY: "sk_test",
      KINGDOM_STRIPE_WEBHOOK_SECRET: "whsec_test"
    }),
    /STRIPE_CONNECT_POLICY_ID/i
  );
});

test("Marketplace checkout enables only when provider, automatic tax and reviewed tax policy are explicit", () => {
  const config = loadMarketplaceTransactionConfig({
    KINGDOM_STRIPE_SECRET_KEY: "sk_test_kingdom",
    KINGDOM_STRIPE_WEBHOOK_SECRET: "whsec_kingdom",
    KINGDOM_STRIPE_CONNECT_POLICY_ID: "stripe-connect-policy-2026-09",
    KINGDOM_MARKETPLACE_CHECKOUT_ENABLED: "true",
    KINGDOM_STRIPE_TAX_ENABLED: "true",
    KINGDOM_STRIPE_TAX_POLICY_ID: "kingdom-tax-policy-2026-09",
    KINGDOM_MARKETPLACE_PUBLIC_BASE_URL: "https://collectors.example.test",
    KINGDOM_MARKETPLACE_PLATFORM_FEE_BPS: "250",
    KINGDOM_MARKETPLACE_SHIPPING_COUNTRIES: "US,CA"
  });
  assert.equal(config.stripeConfigured, true);
  assert.equal(config.checkoutEnabled, true);
  assert.equal(config.automaticTaxEnabled, true);
  assert.equal(config.platformFeeBps, 250);
  assert.deepEqual(config.shippingCountries, ["US", "CA"]);
});

test("Marketplace checkout rejects missing compliance gates and unsafe provider settings", () => {
  const stripe = {
    KINGDOM_STRIPE_SECRET_KEY: "sk_test_kingdom",
    KINGDOM_STRIPE_WEBHOOK_SECRET: "whsec_kingdom",
    KINGDOM_STRIPE_CONNECT_POLICY_ID: "stripe-connect-policy-2026-09"
  };
  assert.throws(
    () => loadMarketplaceTransactionConfig({ ...stripe, KINGDOM_MARKETPLACE_CHECKOUT_ENABLED: "true" }),
    /requires Stripe Tax/i
  );
  assert.throws(
    () => loadMarketplaceTransactionConfig({ ...stripe, KINGDOM_STRIPE_TAX_ENABLED: "true" }),
    /STRIPE_TAX_POLICY_ID/i
  );
  assert.throws(
    () => loadMarketplaceTransactionConfig({ KINGDOM_STRIPE_API_BASE_URL: "http://example.com" }),
    /STRIPE_API_BASE_URL/i
  );
  assert.throws(
    () => loadMarketplaceTransactionConfig({ KINGDOM_MARKETPLACE_PLATFORM_FEE_BPS: "10001" }),
    /PLATFORM_FEE_BPS/i
  );
  assert.throws(
    () => loadMarketplaceTransactionConfig({ KINGDOM_MARKETPLACE_SHIPPING_COUNTRIES: "USA" }),
    /SHIPPING_COUNTRIES/i
  );
});
