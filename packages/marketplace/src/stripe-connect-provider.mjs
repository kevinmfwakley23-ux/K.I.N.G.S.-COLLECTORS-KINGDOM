import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_API_BASE_URL = "https://api.stripe.com";
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

function cleanSecret(value, label) {
  if (typeof value !== "string" || !value.trim() || /[\r\n]/.test(value)) throw new TypeError(`${label} is required.`);
  return value.trim();
}

function isLoopbackHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
}

function cleanUrl(value, label) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new TypeError(`${label} must be a valid URL.`); }
  const localHttp = parsed.protocol === "http:" && isLoopbackHost(parsed.hostname);
  if (parsed.protocol !== "https:" && !localHttp) throw new TypeError(`${label} must use HTTPS except for loopback development.`);
  if (parsed.username || parsed.password) throw new TypeError(`${label} must not contain credentials.`);
  return parsed.toString().replace(/\/$/, "");
}

function cleanId(value, label) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 255) throw new TypeError(`${label} is invalid.`);
  return value.trim();
}

function formBody(entries) {
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  return params;
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function stripeError(status, payload, fallback) {
  const message = payload?.error?.message || fallback || `Stripe request failed with status ${status}.`;
  const error = new Error(message);
  error.name = "StripeConnectError";
  error.code = payload?.error?.code || payload?.error?.type || "stripe_request_failed";
  error.statusCode = status;
  error.providerPayload = payload?.error ?? null;
  return error;
}

function normalizeAccount(account) {
  const due = Array.isArray(account?.requirements?.currently_due) ? account.requirements.currently_due.length : 0;
  const transfers = account?.capabilities?.transfers ?? null;
  return Object.freeze({
    id: account?.id ?? null,
    email: account?.email ?? null,
    country: account?.country ?? null,
    chargesEnabled: account?.charges_enabled === true,
    payoutsEnabled: account?.payouts_enabled === true,
    detailsSubmitted: account?.details_submitted === true,
    transfersStatus: typeof transfers === "string" ? transfers : null,
    requirementsDueCount: due,
    disabledReason: account?.requirements?.disabled_reason ?? null
  });
}

function parseStripeSignature(header) {
  if (typeof header !== "string" || !header.trim()) return null;
  let timestamp = null;
  const signatures = [];
  for (const part of header.split(",")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === "t") timestamp = Number(value);
    if (key === "v1" && /^[a-f0-9]{64}$/i.test(value)) signatures.push(value.toLowerCase());
  }
  if (!Number.isFinite(timestamp) || signatures.length === 0) return null;
  return Object.freeze({ timestamp, signatures: Object.freeze(signatures) });
}

function constantTimeHexEqual(left, right) {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function createStripeConnectProvider({
  secretKey,
  webhookSecret,
  policyId,
  apiBaseUrl = DEFAULT_API_BASE_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  now = () => new Date()
} = {}) {
  const safeSecretKey = cleanSecret(secretKey, "Stripe secret key");
  const safeWebhookSecret = cleanSecret(webhookSecret, "Stripe webhook secret");
  const safePolicyId = cleanSecret(policyId, "Stripe Connect policy ID");
  const safeApiBaseUrl = cleanUrl(apiBaseUrl, "Stripe API base URL");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 500 || timeoutMs > 60000) throw new TypeError("Stripe timeout must be 500 to 60000 milliseconds.");
  if (typeof fetchImpl !== "function") throw new TypeError("Stripe provider requires fetch.");
  if (typeof now !== "function") throw new TypeError("Stripe provider now must be a function.");

  async function request(method, path, { entries = [], idempotencyKey = null } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${safeApiBaseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${safeSecretKey}`,
          ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
        },
        ...(method === "POST" ? { body: formBody(entries).toString() } : {}),
        signal: controller.signal
      });
      const text = await response.text();
      const payload = safeJson(text);
      if (!response.ok) throw stripeError(response.status, payload, text.slice(0, 300));
      if (!payload || typeof payload !== "object") throw stripeError(502, null, "Stripe returned an invalid JSON response.");
      return payload;
    } catch (error) {
      if (error?.name === "AbortError") throw stripeError(504, null, "Stripe request timed out.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function createExpressAccount({ email, country = "US", idempotencyKey }) {
    const payload = await request("POST", "/v1/accounts", {
      idempotencyKey,
      entries: [
        ["type", "express"],
        ["email", email],
        ["country", country],
        ["capabilities[transfers][requested]", "true"]
      ]
    });
    return normalizeAccount(payload);
  }

  async function createAccountLink({ accountId, refreshUrl, returnUrl, idempotencyKey }) {
    const payload = await request("POST", "/v1/account_links", {
      idempotencyKey,
      entries: [
        ["account", cleanId(accountId, "Stripe account ID")],
        ["refresh_url", cleanUrl(refreshUrl, "Stripe onboarding refresh URL")],
        ["return_url", cleanUrl(returnUrl, "Stripe onboarding return URL")],
        ["type", "account_onboarding"],
        ["collection_options[fields]", "eventually_due"]
      ]
    });
    if (typeof payload.url !== "string" || !payload.url.startsWith("https://")) throw stripeError(502, null, "Stripe did not return a valid onboarding URL.");
    return Object.freeze({ id: payload.id ?? null, url: payload.url, expiresAt: payload.expires_at ?? null });
  }

  async function retrieveAccount(accountId) {
    const payload = await request("GET", `/v1/accounts/${encodeURIComponent(cleanId(accountId, "Stripe account ID"))}`);
    return normalizeAccount(payload);
  }

  async function createCheckoutSession({
    orderId,
    sellerAccountId,
    title,
    amountCents,
    currency,
    quantity,
    successUrl,
    cancelUrl,
    idempotencyKey,
    applicationFeeAmount = 0,
    automaticTax = true,
    shippingCountries = ["US"]
  }) {
    const entries = [
      ["mode", "payment"],
      ["success_url", cleanUrl(successUrl, "Stripe Checkout success URL")],
      ["cancel_url", cleanUrl(cancelUrl, "Stripe Checkout cancel URL")],
      ["client_reference_id", orderId],
      ["metadata[kingdom_order_id]", orderId],
      ["line_items[0][price_data][currency]", String(currency).toLowerCase()],
      ["line_items[0][price_data][unit_amount]", amountCents],
      ["line_items[0][price_data][product_data][name]", title],
      ["line_items[0][quantity]", quantity],
      ["payment_intent_data[metadata][kingdom_order_id]", orderId],
      ["payment_intent_data[transfer_data][destination]", cleanId(sellerAccountId, "Stripe destination account ID")],
      ["automatic_tax[enabled]", automaticTax ? "true" : "false"]
    ];
    if (applicationFeeAmount > 0) entries.push(["payment_intent_data[application_fee_amount]", applicationFeeAmount]);
    shippingCountries.forEach((country, index) => entries.push([`shipping_address_collection[allowed_countries][${index}]`, country]));
    const payload = await request("POST", "/v1/checkout/sessions", { entries, idempotencyKey });
    if (typeof payload.id !== "string" || typeof payload.url !== "string" || !payload.url.startsWith("https://")) {
      throw stripeError(502, null, "Stripe did not return a usable secure Checkout Session.");
    }
    return Object.freeze({
      id: payload.id,
      url: payload.url,
      paymentStatus: payload.payment_status ?? null,
      status: payload.status ?? null,
      paymentIntentId: typeof payload.payment_intent === "string" ? payload.payment_intent : payload.payment_intent?.id ?? null
    });
  }

  async function createRefund({ paymentIntentId, amountCents = null, idempotencyKey }) {
    const entries = [
      ["payment_intent", cleanId(paymentIntentId, "Stripe PaymentIntent ID")],
      ["reverse_transfer", "true"]
    ];
    if (amountCents !== null) entries.push(["amount", amountCents]);
    const payload = await request("POST", "/v1/refunds", { entries, idempotencyKey });
    return Object.freeze({ id: payload.id ?? null, status: payload.status ?? null, amount: payload.amount ?? null, paymentIntentId: payload.payment_intent ?? paymentIntentId });
  }

  function verifyWebhook(rawBody, signatureHeader, { toleranceSeconds = DEFAULT_WEBHOOK_TOLERANCE_SECONDS } = {}) {
    if (!Buffer.isBuffer(rawBody) && typeof rawBody !== "string") throw new TypeError("Stripe webhook body must be raw text or bytes.");
    const parsed = parseStripeSignature(signatureHeader);
    if (!parsed) throw stripeError(400, null, "Stripe webhook signature is invalid.");
    const age = Math.abs(Math.floor(now().getTime() / 1000) - parsed.timestamp);
    if (!Number.isInteger(toleranceSeconds) || toleranceSeconds < 0 || age > toleranceSeconds) throw stripeError(400, null, "Stripe webhook signature timestamp is outside the accepted tolerance.");
    const bodyText = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
    const expected = createHmac("sha256", safeWebhookSecret).update(`${parsed.timestamp}.${bodyText}`, "utf8").digest("hex");
    if (!parsed.signatures.some((signature) => constantTimeHexEqual(signature, expected))) throw stripeError(400, null, "Stripe webhook signature verification failed.");
    const event = safeJson(bodyText);
    if (!event || typeof event.id !== "string" || typeof event.type !== "string" || !event.data?.object) throw stripeError(400, null, "Stripe webhook payload is invalid.");
    return event;
  }

  return Object.freeze({
    id: "stripe-connect",
    enabled: true,
    policyId: safePolicyId,
    createExpressAccount,
    createAccountLink,
    retrieveAccount,
    createCheckoutSession,
    createRefund,
    verifyWebhook
  });
}
