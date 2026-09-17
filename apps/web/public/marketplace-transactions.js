const capabilityNode = document.querySelector("#transaction-capabilities");
const refreshButton = document.querySelector("#refresh-transactions");
const returnStatus = document.querySelector("#transaction-return-status");
const sellerStatus = document.querySelector("#seller-payment-status");
const sellerFacts = document.querySelector("#seller-payment-facts");
const sellerOnboarding = document.querySelector("#seller-payment-onboarding");
const ordersStatus = document.querySelector("#orders-status");
const ordersNode = document.querySelector("#transaction-orders");

let capabilities = null;
let sellerPayment = null;

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Request failed with status ${response.status}.`);
    error.code = payload.error || "request_failed";
    error.status = response.status;
    throw error;
  }
  return payload;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

function money(amountCents, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amountCents) / 100);
  } catch {
    return `${currency ?? ""} ${amountCents ?? ""}`.trim();
  }
}

function stateLabel(state) {
  return String(state ?? "unknown").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function renderCapabilities(next) {
  capabilities = next ?? {};
  const rows = [
    ["Payment provider", capabilities.paymentProviderAvailable === true ? "Configured" : "Unavailable"],
    ["Seller onboarding", capabilities.sellerOnboardingAvailable === true ? "Available" : "Unavailable"],
    ["Checkout", capabilities.checkoutAvailable === true ? "Enabled" : "Fail-closed"],
    ["Automatic tax", capabilities.automaticTaxEnabled === true ? "Enabled" : "Disabled"],
    ["Reviewed tax policy", capabilities.taxPolicyConfigured === true ? "Configured" : "Missing"],
    ["Ownership transfer", capabilities.ownershipTransferAvailable === true ? "Available" : "Not authorized by this phase"]
  ];
  capabilityNode.innerHTML = rows.map(([label, value]) => `
    <article class="transaction-capability-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");
}

function renderSellerPayment(status) {
  sellerPayment = status;
  sellerFacts.innerHTML = `
    <div><dt>Status</dt><dd>${escapeHtml(stateLabel(status.status))}</dd></div>
    <div><dt>Provider</dt><dd>${escapeHtml(status.provider ?? (status.providerAvailable ? "Configured provider" : "Unavailable"))}</dd></div>
    <div><dt>Ready for payouts</dt><dd>${status.readyForPayouts ? "Yes" : "No"}</dd></div>
    <div><dt>Requirements due</dt><dd>${Number(status.requirementsDueCount ?? 0)}</dd></div>
  `;
  if (status.status === "active") {
    sellerStatus.textContent = "Seller payment account is active according to the configured provider. Checkout still remains subject to every listing, tax, and inventory gate.";
    sellerOnboarding.disabled = true;
    sellerOnboarding.textContent = "Provider onboarding complete";
    return;
  }
  if (!status.providerAvailable) {
    sellerStatus.textContent = "Seller payment onboarding is unavailable because no production payment provider is configured.";
    sellerOnboarding.disabled = true;
    sellerOnboarding.textContent = "Provider unavailable";
    return;
  }
  sellerStatus.textContent = status.status === "restricted"
    ? "The provider reports this seller payment account as restricted or incomplete. Provider action is required before checkout can be accepted."
    : "Seller payment onboarding is not complete. Complete the provider-hosted flow before accepting checkout.";
  sellerOnboarding.disabled = false;
  sellerOnboarding.textContent = "Open secure provider onboarding";
}

function renderOrders(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    ordersNode.innerHTML = '<article class="marketplace-empty"><h3>No Marketplace orders yet</h3><p>Completed checkout attempts and provider-authoritative payment states will appear here after you start a supported transaction.</p></article>';
    ordersStatus.textContent = "No authenticated Marketplace orders were found.";
    return;
  }
  ordersNode.innerHTML = orders.map((order) => `
    <article class="transaction-order-card" data-order-id="${escapeHtml(order.id)}">
      <div class="transaction-order-heading">
        <div>
          <span class="marketplace-badge">${escapeHtml(stateLabel(order.state))}</span>
          <h3>Order ${escapeHtml(order.id.slice(0, 8))}</h3>
        </div>
        <strong>${escapeHtml(money(order.totalAmountCents, order.currency))}</strong>
      </div>
      <dl class="transaction-order-facts">
        <div><dt>Quantity</dt><dd>${Number(order.quantity)}</dd></div>
        <div><dt>Updated</dt><dd>${escapeHtml(new Date(order.updatedAt).toLocaleString())}</dd></div>
        <div><dt>Payment provider</dt><dd>${escapeHtml(order.paymentProvider ?? "Unavailable")}</dd></div>
        <div><dt>Ownership transferred</dt><dd>No</dd></div>
      </dl>
      <div class="transaction-actions">
        <a class="marketplace-secondary-link" href="/marketplace-listing.html?id=${encodeURIComponent(order.listingId)}">View listing</a>
      </div>
    </article>
  `).join("");
  ordersStatus.textContent = `Loaded ${orders.length} authenticated Marketplace order${orders.length === 1 ? "" : "s"}. Payment and dispute states remain provider-event evidence, not automatic ownership transfer.`;
}

function safeProviderUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  let parsed;
  try { parsed = new URL(value, window.location.origin); } catch { return null; }
  const host = parsed.hostname.toLowerCase();
  const loopback = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) return null;
  return parsed.href;
}

function showReturnContext() {
  const params = new URL(window.location.href).searchParams;
  const checkout = params.get("checkout");
  const order = params.get("order");
  const seller = params.get("seller") ?? params.get("payments");
  if (checkout === "success") {
    returnStatus.textContent = `Returned from provider checkout${order ? ` for order ${order.slice(0, 8)}` : ""}. This redirect does not prove payment; the Kingdom will show the webhook-authoritative order state below.`;
  } else if (checkout === "cancelled") {
    returnStatus.textContent = "Provider checkout was cancelled or exited. Inventory release and final order state remain server-authoritative.";
  } else if (seller) {
    returnStatus.textContent = "Returned from seller payment onboarding. Provider status is being refreshed below; the redirect itself does not mark the account ready.";
  } else {
    returnStatus.textContent = "Transaction surfaces are fail-closed until the required provider, tax, seller, and inventory gates are satisfied.";
  }
}

async function loadCapabilities() {
  const payload = await requestJson("/api/marketplace/transactions/capabilities");
  renderCapabilities(payload.capabilities ?? {});
}

async function loadSellerPayment() {
  try {
    const payload = await requestJson("/api/marketplace/seller/payments/status");
    renderSellerPayment(payload.status ?? {});
  } catch (error) {
    if (error.code === "unauthorized") {
      sellerStatus.innerHTML = 'Sign in through the <a href="/auth.html">Royal Gate</a> to review or configure seller payment onboarding.';
      sellerFacts.replaceChildren();
      sellerOnboarding.disabled = true;
      return;
    }
    sellerStatus.textContent = `Seller payment status is unavailable: ${error.message}`;
    sellerOnboarding.disabled = true;
  }
}

async function loadOrders() {
  try {
    const payload = await requestJson("/api/marketplace/orders?limit=100");
    renderOrders(payload.orders ?? []);
  } catch (error) {
    if (error.code === "unauthorized") {
      ordersStatus.innerHTML = 'Sign in through the <a href="/auth.html">Royal Gate</a> to review private Marketplace orders.';
      ordersNode.replaceChildren();
      return;
    }
    ordersStatus.textContent = `Marketplace order history is unavailable: ${error.message}`;
    ordersNode.replaceChildren();
  }
}

async function refreshAll() {
  refreshButton.disabled = true;
  try {
    await loadCapabilities();
    await Promise.all([loadSellerPayment(), loadOrders()]);
  } catch (error) {
    capabilityNode.innerHTML = `<article class="marketplace-empty"><p>Transaction capability verification failed: ${escapeHtml(error.message)}</p></article>`;
  } finally {
    refreshButton.disabled = false;
  }
}

sellerOnboarding.addEventListener("click", async () => {
  sellerOnboarding.disabled = true;
  sellerStatus.textContent = "Requesting a provider-hosted onboarding link…";
  try {
    const payload = await requestJson("/api/marketplace/seller/payments/onboarding", { method: "POST" });
    renderSellerPayment(payload.onboarding?.status ?? sellerPayment ?? {});
    if (!payload.onboarding?.onboardingUrl) {
      sellerStatus.textContent = "The provider reports onboarding complete; no additional onboarding link is required.";
      return;
    }
    const destination = safeProviderUrl(payload.onboarding.onboardingUrl);
    if (!destination) throw new Error("The payment provider returned an unsafe onboarding destination.");
    sellerStatus.textContent = "Opening secure provider onboarding. Returning from the provider will trigger a fresh status check.";
    window.location.assign(destination);
  } catch (error) {
    if (error.code === "unauthorized") {
      sellerStatus.innerHTML = 'Sign in through the <a href="/auth.html">Royal Gate</a> before starting seller payment onboarding.';
    } else {
      sellerStatus.textContent = `Seller onboarding did not start: ${error.message}`;
    }
    sellerOnboarding.disabled = !(capabilities?.sellerOnboardingAvailable && sellerPayment?.status !== "active");
  }
});

refreshButton.addEventListener("click", refreshAll);
showReturnContext();
await refreshAll();
