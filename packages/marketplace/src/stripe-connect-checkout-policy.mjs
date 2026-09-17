import { createStripeConnectProvider } from "./stripe-connect-provider.mjs";

const DEFAULT_CHECKOUT_TTL_SECONDS = 30 * 60;

function cleanTtl(value) {
  const ttl = Number(value ?? DEFAULT_CHECKOUT_TTL_SECONDS);
  if (!Number.isInteger(ttl) || ttl < 30 * 60 || ttl > 24 * 60 * 60) {
    throw new TypeError("Stripe Checkout TTL must be between 30 minutes and 24 hours.");
  }
  return ttl;
}

function sellerStallReturnUrl(value) {
  const url = new URL(value);
  url.pathname = "/marketplace.html";
  url.hash = "seller-stall";
  return url.toString();
}

export function createPolicyBoundStripeConnectProvider({
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  checkoutTtlSeconds = DEFAULT_CHECKOUT_TTL_SECONDS,
  ...options
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("Stripe checkout policy requires fetch.");
  if (typeof now !== "function") throw new TypeError("Stripe checkout policy now must be a function.");
  const ttl = cleanTtl(checkoutTtlSeconds);

  const policyFetch = async (url, init = {}) => {
    const parsed = new URL(url);
    if (init.method === "POST" && parsed.pathname === "/v1/checkout/sessions") {
      const body = new URLSearchParams(String(init.body ?? ""));
      const createdAtSeconds = Math.floor(now().getTime() / 1000);
      body.set("expires_at", String(createdAtSeconds + ttl));
      return fetchImpl(url, { ...init, body: body.toString() });
    }
    return fetchImpl(url, init);
  };

  const provider = createStripeConnectProvider({
    ...options,
    fetchImpl: policyFetch,
    now
  });

  return Object.freeze({
    ...provider,
    checkoutTtlSeconds: ttl,
    createAccountLink(input = {}) {
      return provider.createAccountLink({
        ...input,
        refreshUrl: sellerStallReturnUrl(input.refreshUrl),
        returnUrl: sellerStallReturnUrl(input.returnUrl)
      });
    }
  });
}
