function parseBoolean(value, name, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false.`);
}

function parseInteger(value, name, { fallback, minimum, maximum }) {
  if (value === undefined || value === null || value === "") return fallback;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < minimum || numeric > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} through ${maximum}.`);
  }
  return numeric;
}

function optionalSecret(value, name, maximumLength = 4096) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${name} must be text when provided.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maximumLength || /[\r\n]/.test(cleaned)) throw new Error(`${name} is invalid.`);
  return cleaned;
}

function externalUrl(value, name, { allowLocalHttp = true } = {}) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`${name} must be a valid URL.`); }
  const local = ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(allowLocalHttp && local && parsed.protocol === "http:")) {
    throw new Error(`${name} must use https outside local development.`);
  }
  return parsed.toString().replace(/\/$/, "");
}

function shippingCountries(value) {
  const raw = value ?? "US";
  const countries = String(raw).split(",").map((entry) => entry.trim().toUpperCase()).filter(Boolean);
  if (countries.length < 1 || countries.length > 25 || countries.some((entry) => !/^[A-Z]{2}$/.test(entry))) {
    throw new Error("KINGDOM_MARKETPLACE_SHIPPING_COUNTRIES must be a comma-separated list of two-letter country codes.");
  }
  return Object.freeze([...new Set(countries)]);
}

export function loadMarketplaceTransactionConfig(env = process.env) {
  const stripeSecretKey = optionalSecret(env.KINGDOM_STRIPE_SECRET_KEY, "KINGDOM_STRIPE_SECRET_KEY");
  const stripeWebhookSecret = optionalSecret(env.KINGDOM_STRIPE_WEBHOOK_SECRET, "KINGDOM_STRIPE_WEBHOOK_SECRET");
  const stripeConnectPolicyId = optionalSecret(env.KINGDOM_STRIPE_CONNECT_POLICY_ID, "KINGDOM_STRIPE_CONNECT_POLICY_ID", 240);
  const stripeParts = [stripeSecretKey, stripeWebhookSecret, stripeConnectPolicyId].filter(Boolean).length;
  if (stripeParts !== 0 && stripeParts !== 3) {
    throw new Error("Stripe Connect requires KINGDOM_STRIPE_SECRET_KEY, KINGDOM_STRIPE_WEBHOOK_SECRET, and KINGDOM_STRIPE_CONNECT_POLICY_ID together.");
  }

  const checkoutRequested = parseBoolean(env.KINGDOM_MARKETPLACE_CHECKOUT_ENABLED, "KINGDOM_MARKETPLACE_CHECKOUT_ENABLED", false);
  const automaticTaxEnabled = parseBoolean(env.KINGDOM_STRIPE_TAX_ENABLED, "KINGDOM_STRIPE_TAX_ENABLED", false);
  const taxPolicyId = optionalSecret(env.KINGDOM_STRIPE_TAX_POLICY_ID, "KINGDOM_STRIPE_TAX_POLICY_ID", 240);
  const publicBaseUrl = externalUrl(env.KINGDOM_MARKETPLACE_PUBLIC_BASE_URL ?? "http://127.0.0.1:8788", "KINGDOM_MARKETPLACE_PUBLIC_BASE_URL");
  const stripeApiBaseUrl = externalUrl(env.KINGDOM_STRIPE_API_BASE_URL ?? "https://api.stripe.com", "KINGDOM_STRIPE_API_BASE_URL");
  const stripeTimeoutMs = parseInteger(env.KINGDOM_STRIPE_TIMEOUT_MS, "KINGDOM_STRIPE_TIMEOUT_MS", { fallback: 8000, minimum: 500, maximum: 60000 });
  const platformFeeBps = parseInteger(env.KINGDOM_MARKETPLACE_PLATFORM_FEE_BPS, "KINGDOM_MARKETPLACE_PLATFORM_FEE_BPS", { fallback: 0, minimum: 0, maximum: 10000 });
  const allowedShippingCountries = shippingCountries(env.KINGDOM_MARKETPLACE_SHIPPING_COUNTRIES);
  const stripeConfigured = stripeParts === 3;

  if (automaticTaxEnabled && !taxPolicyId) {
    throw new Error("KINGDOM_STRIPE_TAX_ENABLED=true requires KINGDOM_STRIPE_TAX_POLICY_ID naming the reviewed marketplace tax policy.");
  }
  if (checkoutRequested && !stripeConfigured) {
    throw new Error("KINGDOM_MARKETPLACE_CHECKOUT_ENABLED=true requires complete Stripe Connect configuration.");
  }
  if (checkoutRequested && (!automaticTaxEnabled || !taxPolicyId)) {
    throw new Error("KINGDOM_MARKETPLACE_CHECKOUT_ENABLED=true requires Stripe Tax plus an explicit reviewed KINGDOM_STRIPE_TAX_POLICY_ID.");
  }
  if (checkoutRequested && publicBaseUrl.startsWith("http://") && !publicBaseUrl.startsWith("http://127.0.0.1") && !publicBaseUrl.startsWith("http://localhost")) {
    throw new Error("Live Marketplace checkout requires an https KINGDOM_MARKETPLACE_PUBLIC_BASE_URL.");
  }

  return Object.freeze({
    stripeConfigured,
    stripeSecretKey,
    stripeWebhookSecret,
    stripeConnectPolicyId,
    stripeApiBaseUrl,
    stripeTimeoutMs,
    checkoutRequested,
    checkoutEnabled: checkoutRequested && stripeConfigured && automaticTaxEnabled && Boolean(taxPolicyId),
    automaticTaxEnabled,
    taxPolicyId,
    publicBaseUrl,
    platformFeeBps,
    shippingCountries: allowedShippingCountries
  });
}
