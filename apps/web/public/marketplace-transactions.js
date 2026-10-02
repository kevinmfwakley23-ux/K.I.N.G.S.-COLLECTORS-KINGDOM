const capabilityNode = document.querySelector("#transaction-capabilities");
const refreshButton = document.querySelector("#refresh-transactions");
const returnStatus = document.querySelector("#transaction-return-status");
const sellerStatus = document.querySelector("#seller-payment-status");
const sellerFacts = document.querySelector("#seller-payment-facts");
const sellerOnboarding = document.querySelector("#seller-payment-onboarding");
const sellerOrdersStatus = document.querySelector("#seller-orders-status");
const sellerOrdersNode = document.querySelector("#seller-fulfillment-orders");
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
    error.details = payload.details ?? null;
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

function fractionDigits(currency) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

function money(amountCents, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amountCents) / (10 ** fractionDigits(currency)));
  } catch {
    return `${currency ?? ""} ${amountCents ?? ""}`.trim();
  }
}

function stateLabel(state) {
  return String(state ?? "unknown").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function newIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return `kingdom-shipment-${globalThis.crypto.randomUUID()}`;
  const values = new Uint32Array(4);
  globalThis.crypto?.getRandomValues?.(values);
  return `kingdom-shipment-${Date.now()}-${Array.from(values, (value) => value.toString(16)).join("")}`;
}

function renderCapabilities(next) {
  capabilities = next ?? {};
  const rows = [
    ["Payment provider", capabilities.paymentProviderAvailable === true ? "Configured" : "Unavailable"],
    ["Seller onboarding", capabilities.sellerOnboardingAvailable === true ? "Available" : "Unavailable"],
    ["Checkout", capabilities.checkoutAvailable === true ? "Enabled" : "Fail-closed"],
    ["Automatic tax", capabilities.automaticTaxEnabled === true ? "Enabled" : "Disabled"],
    ["Reviewed tax policy", capabilities.taxPolicyConfigured === true ? "Configured" : "Missing"],
    ["Seller shipment evidence", capabilities.sellerShipmentEvidenceAvailable === true ? "Available after paid state" : "Unavailable"],
    ["Shipment evidence integrity", capabilities.shipmentEvidenceIntegrityAvailable === true ? "SHA-256 locked" : "Unavailable"],
    ["Evidence timeline", capabilities.appendOnlyEvidenceTimelineAvailable === true ? "Append-only" : "Unavailable"],
    ["Carrier verification", capabilities.carrierVerificationAvailable === true ? "Available" : "Not yet enabled"],
    ["Delivery verification", capabilities.deliveryVerificationAvailable === true ? "Available" : "Not yet enabled"],
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

function shipmentEvidenceList(shipments) {
  if (!Array.isArray(shipments) || shipments.length === 0) return '<p class="marketplace-form-note">No seller shipment evidence has been recorded.</p>';
  return `<ul class="transaction-shipment-list">${shipments.map((shipment) => {
    const evidence = shipment.trackingNumber
      ? `${escapeHtml(shipment.carrier)} · ${escapeHtml(shipment.trackingNumber)}`
      : `No tracking · ${escapeHtml(stateLabel(shipment.noTrackingReason))}`;
    const digest = typeof shipment.evidenceSha256 === "string" ? shipment.evidenceSha256 : "";
    const integrity = digest
      ? `<span>Evidence SHA-256: <code title="${escapeHtml(digest)}">${escapeHtml(digest.slice(0, 16))}…</code></span>`
      : "";
    return `<li><strong>${Number(shipment.quantity)} unit${Number(shipment.quantity) === 1 ? "" : "s"}</strong> · ${evidence} · Seller declared ${escapeHtml(new Date(shipment.declaredShippedAt).toLocaleString())}${integrity}<span>Carrier verified: No · Delivery verified: No</span></li>`;
  }).join("")}</ul>`;
}

function evidenceTimeline(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return '<p class="marketplace-form-note">No append-only fulfillment evidence events are recorded for this order yet.</p>';
  }
  return `<ol class="transaction-evidence-events">${events.map((entry) => {
    const digest = typeof entry.metadata?.evidenceSha256 === "string" ? entry.metadata.evidenceSha256 : "";
    return `<li>
      <strong>${escapeHtml(stateLabel(entry.eventType))}</strong>
      <span>${escapeHtml(new Date(entry.createdAt).toLocaleString())} · Source: ${escapeHtml(entry.source)}</span>
      ${digest ? `<code title="${escapeHtml(digest)}">${escapeHtml(digest)}</code>` : ""}
    </li>`;
  }).join("")}</ol>`;
}

async function toggleEvidenceTimeline(button) {
  const orderId = button.dataset.orderEvidenceId;
  const card = button.closest("[data-order-id]");
  const target = card?.querySelector("[data-evidence-timeline]");
  if (!orderId || !target) return;
  if (!target.hidden) {
    target.hidden = true;
    button.textContent = "View evidence timeline";
    return;
  }
  button.disabled = true;
  button.textContent = "Loading evidence…";
  try {
    const payload = await requestJson(`/api/marketplace/fulfillment/orders/${encodeURIComponent(orderId)}`);
    target.innerHTML = evidenceTimeline(payload.order?.fulfillmentEvidenceEvents ?? []);
    target.hidden = false;
    button.textContent = "Hide evidence timeline";
  } catch (error) {
    target.innerHTML = `<p class="marketplace-form-note">Evidence timeline could not be loaded: ${escapeHtml(error.message)}</p>`;
    target.hidden = false;
    button.textContent = "Retry evidence timeline";
  } finally {
    button.disabled = false;
  }
}

function renderOrders(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    ordersNode.innerHTML = '<article class="marketplace-empty"><h3>No Marketplace orders yet</h3><p>Checkout attempts, provider-authoritative payment states, and seller-declared fulfillment evidence will appear here after you start a supported transaction.</p></article>';
    ordersStatus.textContent = "No authenticated Marketplace orders were found.";
    return;
  }
  ordersNode.innerHTML = orders.map((order) => `
    <article class="transaction-order-card" data-order-id="${escapeHtml(order.id)}">
      <div class="transaction-order-heading">
        <div>
          <span class="marketplace-badge">${escapeHtml(stateLabel(order.state))}</span>
          <h3>${escapeHtml(order.title || `Order ${order.id.slice(0, 8)}`)}</h3>
        </div>
        <strong>${escapeHtml(money(order.totalAmountCents, order.currency))}</strong>
      </div>
      <dl class="transaction-order-facts">
        <div><dt>Quantity</dt><dd>${Number(order.quantity)}</dd></div>
        <div><dt>Updated</dt><dd>${escapeHtml(new Date(order.updatedAt).toLocaleString())}</dd></div>
        <div><dt>Fulfillment</dt><dd>${escapeHtml(stateLabel(order.fulfillment?.status))} (${Number(order.fulfillment?.shippedQuantity ?? 0)}/${Number(order.quantity)})</dd></div>
        <div><dt>Ownership transferred</dt><dd>No</dd></div>
      </dl>
      ${shipmentEvidenceList(order.shipments)}
      <div class="transaction-actions">
        <a class="marketplace-secondary-link" href="/marketplace-listing.html?id=${encodeURIComponent(order.listingId)}">View listing</a>
        <button type="button" class="marketplace-secondary" data-order-evidence-id="${escapeHtml(order.id)}">View evidence timeline</button>
      </div>
      <div class="transaction-evidence-timeline" data-evidence-timeline hidden></div>
    </article>
  `).join("");
  ordersStatus.textContent = `Loaded ${orders.length} authenticated Marketplace order${orders.length === 1 ? "" : "s"}. Tracking shown here is seller-declared evidence until an independent carrier verification layer exists.`;
}

function sellerShipmentForm(order) {
  const remaining = Number(order.fulfillment?.remainingQuantity ?? order.quantity);
  if (order.state !== "paid") {
    return `<p class="marketplace-form-note">Shipment entry is locked until provider-authoritative payment state is Paid. Current state: ${escapeHtml(stateLabel(order.state))}.</p>`;
  }
  if (order.fulfillmentMethod === "local-pickup") {
    return '<p class="marketplace-form-note">This is a local-pickup order. The Kingdom does not convert pickup into shipment evidence; a separate pickup verification workflow is required.</p>';
  }
  if (remaining < 1) {
    return '<p class="marketplace-form-note">The full ordered quantity already has seller-declared shipment evidence. Delivery is still not independently verified.</p>';
  }
  return `
    <form class="transaction-shipment-form" data-shipment-order-id="${escapeHtml(order.id)}">
      <div>
        <label>Quantity<input name="quantity" type="number" min="1" max="${remaining}" value="${remaining}" required></label>
        <label>Carrier<input name="carrier" type="text" maxlength="80" autocomplete="off" aria-label="Shipping carrier"></label>
        <label>Tracking number<input name="trackingNumber" type="text" maxlength="120" autocomplete="off" aria-label="Carrier tracking number"></label>
        <label>No-tracking reason
          <select name="noTrackingReason">
            <option value="">Use carrier tracking above</option>
            <option value="carrier-no-tracking">Carrier does not provide tracking</option>
            <option value="oversize-freight">Oversize / freight exception</option>
            <option value="other">Other documented shipping exception</option>
          </select>
        </label>
      </div>
      <button type="submit">Record seller-declared shipment</button>
      <p class="marketplace-form-note" data-shipment-form-status role="status" aria-live="polite">Carrier and tracking number must be entered together. If neither is available, choose an explicit no-tracking reason.</p>
    </form>`;
}

function renderSellerOrders(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    sellerOrdersNode.innerHTML = '<article class="marketplace-empty"><h3>No seller orders yet</h3><p>Paid Marketplace orders for your listings will appear here when there is fulfillment evidence to manage.</p></article>';
    sellerOrdersStatus.textContent = "No Marketplace seller orders were found for this account.";
    return;
  }
  sellerOrdersNode.innerHTML = orders.map((order) => `
    <article class="transaction-order-card transaction-seller-order" data-order-id="${escapeHtml(order.id)}">
      <div class="transaction-order-heading">
        <div><span class="marketplace-badge">${escapeHtml(stateLabel(order.state))}</span><h3>${escapeHtml(order.title || `Order ${order.id.slice(0, 8)}`)}</h3></div>
        <strong>${escapeHtml(money(order.totalAmountCents, order.currency))}</strong>
      </div>
      <dl class="transaction-order-facts">
        <div><dt>Ordered</dt><dd>${Number(order.quantity)}</dd></div>
        <div><dt>Seller-declared shipped</dt><dd>${Number(order.fulfillment?.shippedQuantity ?? 0)}</dd></div>
        <div><dt>Remaining</dt><dd>${Number(order.fulfillment?.remainingQuantity ?? order.quantity)}</dd></div>
        <div><dt>Method</dt><dd>${escapeHtml(stateLabel(order.fulfillmentMethod))}</dd></div>
      </dl>
      ${shipmentEvidenceList(order.shipments)}
      <div class="transaction-actions">
        <button type="button" class="marketplace-secondary" data-order-evidence-id="${escapeHtml(order.id)}">View evidence timeline</button>
      </div>
      <div class="transaction-evidence-timeline" data-evidence-timeline hidden></div>
      ${sellerShipmentForm(order)}
    </article>
  `).join("");
  const paidReady = orders.filter((order) => order.state === "paid" && Number(order.fulfillment?.remainingQuantity ?? 0) > 0 && order.fulfillmentMethod !== "local-pickup").length;
  sellerOrdersStatus.textContent = `Loaded ${orders.length} seller order${orders.length === 1 ? "" : "s"}; ${paidReady} currently accept additional shipment evidence. Shipment entry never proves delivery or transfers ownership.`;
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
    returnStatus.textContent = `Returned from provider checkout${order ? ` for order ${order.slice(0, 8)}` : ""}. This redirect does not prove payment; the Kingdom will show webhook-authoritative order state below.`;
  } else if (checkout === "cancelled") {
    returnStatus.textContent = "Provider checkout was cancelled or exited. Inventory release and final order state remain server-authoritative.";
  } else if (seller) {
    returnStatus.textContent = "Returned from seller payment onboarding. Provider status is being refreshed below; the redirect itself does not mark the account ready.";
  } else {
    returnStatus.textContent = "Transaction surfaces are fail-closed until required provider, tax, seller, inventory, payment-state, and fulfillment rules are satisfied.";
  }
}

async function loadCapabilities() {
  const [transactionPayload, fulfillmentPayload] = await Promise.all([
    requestJson("/api/marketplace/transactions/capabilities"),
    requestJson("/api/marketplace/fulfillment/capabilities")
  ]);
  renderCapabilities({ ...(transactionPayload.capabilities ?? {}), ...(fulfillmentPayload.capabilities ?? {}) });
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

async function loadSellerOrders() {
  try {
    const payload = await requestJson("/api/marketplace/fulfillment/seller/orders?limit=100");
    renderSellerOrders(payload.orders ?? []);
  } catch (error) {
    if (error.code === "unauthorized") {
      sellerOrdersStatus.innerHTML = 'Sign in through the <a href="/auth.html">Royal Gate</a> to review seller fulfillment evidence.';
      sellerOrdersNode.replaceChildren();
      return;
    }
    sellerOrdersStatus.textContent = `Seller fulfillment evidence is unavailable: ${error.message}`;
    sellerOrdersNode.replaceChildren();
  }
}

async function loadOrders() {
  try {
    const payload = await requestJson("/api/marketplace/fulfillment/orders?limit=100");
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
    await Promise.all([loadSellerPayment(), loadSellerOrders(), loadOrders()]);
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

for (const root of [ordersNode, sellerOrdersNode]) {
  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-order-evidence-id]");
    if (button) void toggleEvidenceTimeline(button);
  });
}

sellerOrdersNode.addEventListener("submit", async (event) => {
  const form = event.target.closest("form[data-shipment-order-id]");
  if (!form) return;
  event.preventDefault();
  const orderId = form.dataset.shipmentOrderId;
  const submit = form.querySelector('button[type="submit"]');
  const formStatus = form.querySelector("[data-shipment-form-status]");
  const data = new FormData(form);
  const body = {
    quantity: Number(data.get("quantity")),
    carrier: String(data.get("carrier") ?? "").trim() || null,
    trackingNumber: String(data.get("trackingNumber") ?? "").trim() || null,
    noTrackingReason: String(data.get("noTrackingReason") ?? "").trim() || null,
    idempotencyKey: newIdempotencyKey()
  };
  submit.disabled = true;
  formStatus.textContent = "Recording append-only seller shipment evidence. This does not verify carrier acceptance or delivery.";
  try {
    await requestJson(`/api/marketplace/fulfillment/seller/orders/${encodeURIComponent(orderId)}/shipments`, {
      method: "POST",
      headers: { "Idempotency-Key": body.idempotencyKey },
      body: JSON.stringify(body)
    });
    formStatus.textContent = "Seller shipment evidence recorded. Carrier and delivery verification remain unavailable in this phase.";
    await Promise.all([loadSellerOrders(), loadOrders()]);
  } catch (error) {
    if (error.code === "marketplace_shipment_quantity_exceeds_remaining" && error.details?.remainingQuantity !== undefined) {
      formStatus.textContent = `Shipment was not recorded because only ${error.details.remainingQuantity} unit(s) remain unshipped.`;
    } else {
      formStatus.textContent = `Shipment evidence was not recorded: ${error.message}`;
    }
    submit.disabled = false;
  }
});

refreshButton.addEventListener("click", refreshAll);
showReturnContext();
await refreshAll();
