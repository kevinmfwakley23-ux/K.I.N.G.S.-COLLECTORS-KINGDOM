const MAX_CONCURRENT_REQUESTS = 6;
const STALE_AFTER_MS = 15_000;

const queue = [];
const queued = new WeakSet();
const trackedCards = new Set();
let activeRequests = 0;

function cleanListingId(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requestError(payload, status) {
  const error = new Error(payload?.message || `Marketplace request failed with status ${status}.`);
  error.code = payload?.error || "request_failed";
  error.status = status;
  error.details = payload?.details ?? null;
  return error;
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw requestError(payload, response.status);
  return payload;
}

function ensurePanel(card) {
  let panel = card.querySelector("[data-listing-live-availability]");
  if (panel) return panel;

  panel = document.createElement("section");
  panel.className = "marketplace-live-availability";
  panel.dataset.listingLiveAvailability = "";
  panel.setAttribute("aria-live", "polite");
  panel.innerHTML = `
    <p class="marketplace-live-availability-status" data-listing-live-status>Checking live availability…</p>
    <div class="marketplace-live-checkout" data-listing-live-checkout hidden></div>
    <p class="marketplace-live-truth">Live availability reflects current reservations. Payment is not delivery or ownership transfer.</p>
  `;

  const actions = card.querySelector(".marketplace-card-actions");
  if (actions) card.insertBefore(panel, actions);
  else card.append(panel);
  return panel;
}

function quantityControl(availableQuantity) {
  const wrapper = document.createElement("div");
  wrapper.className = "marketplace-live-checkout-controls";

  const label = document.createElement("label");
  label.textContent = "Quantity";
  label.className = "marketplace-live-quantity-label";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.max = String(Math.max(1, availableQuantity));
  input.step = "1";
  input.value = "1";
  input.inputMode = "numeric";
  input.dataset.listingCheckoutQuantity = "";
  input.setAttribute("aria-label", "Checkout quantity");

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Secure checkout";
  button.dataset.listingSecureCheckout = "";

  label.append(input);
  wrapper.append(label, button);
  return { wrapper, input, button };
}

function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return `kingdom-web-${globalThis.crypto.randomUUID()}`;
  const bytes = new Uint32Array(4);
  globalThis.crypto?.getRandomValues?.(bytes);
  const entropy = [...bytes].map((value) => value.toString(16).padStart(8, "0")).join("");
  return `kingdom-web-${Date.now()}-${entropy || "fallback"}`;
}

function safeCheckoutUrl(value) {
  if (typeof value !== "string") return null;
  let parsed;
  try { parsed = new URL(value); } catch { return null; }
  return parsed.protocol === "https:" ? parsed.href : null;
}

function statusText(availability) {
  const available = Number(availability.availableQuantity ?? 0);
  const maximum = Number(availability.maximumQuantity ?? 0);
  const reserved = Number(availability.reservedQuantity ?? 0);

  if (available <= 0) {
    return maximum > 0
      ? `Currently unavailable: all ${maximum} offered unit${maximum === 1 ? "" : "s"} are reserved or held by active orders.`
      : "Currently unavailable: no live sellable quantity remains.";
  }
  const reservedNote = reserved > 0 ? ` · ${reserved} currently reserved` : "";
  return `Live availability: ${available} of ${maximum} unit${maximum === 1 ? "" : "s"} available${reservedNote}.`;
}

async function beginCheckout(card, availability, panel, input, button) {
  const listingId = cleanListingId(card.dataset.listingId);
  if (!listingId) return;

  const available = Number(availability.availableQuantity ?? 0);
  const quantity = Number(input.value);
  const status = panel.querySelector("[data-listing-live-status]");

  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > available) {
    status.textContent = `Choose a quantity from 1 through ${available}.`;
    input.focus();
    return;
  }

  if (!button.dataset.idempotencyKey) button.dataset.idempotencyKey = createIdempotencyKey();
  button.disabled = true;
  status.textContent = "Creating a provider-hosted secure Checkout session…";

  try {
    const payload = await requestJson(`/api/marketplace/listings/${encodeURIComponent(listingId)}/checkout`, {
      method: "POST",
      headers: { "Idempotency-Key": button.dataset.idempotencyKey },
      body: JSON.stringify({ quantity })
    });
    const checkoutUrl = safeCheckoutUrl(payload?.order?.checkoutUrl);
    if (!checkoutUrl) throw requestError({ message: "The payment provider did not return a secure Checkout URL.", error: "marketplace_checkout_url_invalid" }, 502);
    window.location.assign(checkoutUrl);
  } catch (error) {
    if (error.status === 401) {
      status.textContent = "Sign in through the Royal Gate before starting secure Checkout.";
    } else if (error.code === "marketplace_checkout_quantity" || error.code === "marketplace_checkout_unavailable" || error.status === 409) {
      status.textContent = error.message;
      button.dataset.idempotencyKey = "";
      schedule(card, true);
    } else {
      status.textContent = error.message || "Secure Checkout is unavailable right now.";
    }
    button.disabled = false;
  }
}

function renderAvailability(card, payload) {
  const availability = payload?.availability;
  const panel = ensurePanel(card);
  const status = panel.querySelector("[data-listing-live-status]");
  const checkout = panel.querySelector("[data-listing-live-checkout]");
  checkout.replaceChildren();
  checkout.hidden = true;

  if (!availability || typeof availability !== "object") {
    throw requestError({ message: "Marketplace availability evidence is missing.", error: "marketplace_availability_missing" }, 502);
  }

  const available = Number(availability.availableQuantity ?? 0);
  const maximum = Number(availability.maximumQuantity ?? 0);
  const reserved = Number(availability.reservedQuantity ?? 0);
  const ready = availability.checkoutAvailable === true && available > 0;

  card.dataset.marketAvailability = available > 0 ? "available" : "reserved";
  card.dataset.marketAvailableQuantity = String(Math.max(0, available));
  card.dataset.marketReservedQuantity = String(Math.max(0, reserved));
  status.textContent = statusText(availability);

  if (ready) {
    const controls = quantityControl(available);
    controls.button.addEventListener("click", () => beginCheckout(card, availability, panel, controls.input, controls.button));
    checkout.append(controls.wrapper);
    checkout.hidden = false;
  } else if (available > 0) {
    const explanation = document.createElement("p");
    explanation.className = "marketplace-live-checkout-note";
    explanation.textContent = availability.sellerPaymentReady === false
      ? "This offer is available, but the seller's provider-hosted payment setup is not ready."
      : "This offer is available, but secure Checkout is not enabled in this deployment.";
    checkout.append(explanation);
    checkout.hidden = false;
  }

  const checkedAt = availability.checkedAt ? new Date(availability.checkedAt) : new Date();
  const stamp = document.createElement("time");
  stamp.className = "marketplace-live-checked-at";
  stamp.dateTime = Number.isFinite(checkedAt.getTime()) ? checkedAt.toISOString() : new Date().toISOString();
  stamp.textContent = `Checked ${Number.isFinite(checkedAt.getTime()) ? checkedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "just now"}`;
  panel.append(stamp);
}

function renderFailure(card, error) {
  const panel = ensurePanel(card);
  const status = panel.querySelector("[data-listing-live-status]");
  const checkout = panel.querySelector("[data-listing-live-checkout]");
  checkout.replaceChildren();
  checkout.hidden = true;

  if (error.status === 404 || error.code === "marketplace_listing_not_found") {
    card.dataset.marketAvailability = "unavailable";
    status.textContent = "This offer is no longer available.";
    return;
  }
  card.dataset.marketAvailability = "unknown";
  status.textContent = "Live reservation availability could not be verified. Treat this published offer as unconfirmed until availability can be checked.";
}

async function hydrate(card) {
  if (!card?.isConnected) return;
  const listingId = cleanListingId(card.dataset.listingId);
  if (!listingId) return;

  const lastChecked = Number(card.dataset.marketAvailabilityCheckedAt ?? 0);
  if (lastChecked && Date.now() - lastChecked < STALE_AFTER_MS) return;
  if (card.dataset.marketAvailabilityLoading === "true") return;

  card.dataset.marketAvailabilityLoading = "true";
  ensurePanel(card);
  try {
    const payload = await requestJson(`/api/marketplace/listings/${encodeURIComponent(listingId)}/checkout-availability`);
    renderAvailability(card, payload);
  } catch (error) {
    renderFailure(card, error);
  } finally {
    card.dataset.marketAvailabilityLoading = "false";
    card.dataset.marketAvailabilityCheckedAt = String(Date.now());
  }
}

function pumpQueue() {
  while (activeRequests < MAX_CONCURRENT_REQUESTS && queue.length) {
    const card = queue.shift();
    queued.delete(card);
    if (!card?.isConnected) continue;
    activeRequests += 1;
    hydrate(card).finally(() => {
      activeRequests -= 1;
      pumpQueue();
    });
  }
}

function schedule(card, force = false) {
  if (!(card instanceof Element) || !card.matches(".marketplace-card[data-listing-id]")) return;
  trackedCards.add(card);
  if (force) card.dataset.marketAvailabilityCheckedAt = "0";
  if (queued.has(card) || card.dataset.marketAvailabilityLoading === "true") return;
  queued.add(card);
  queue.push(card);
  pumpQueue();
}

const intersection = "IntersectionObserver" in globalThis
  ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        intersection.unobserve(entry.target);
        schedule(entry.target);
      }
    }, { rootMargin: "240px 0px" })
  : null;

function registerCard(card) {
  if (!(card instanceof Element) || !card.matches(".marketplace-card[data-listing-id]")) return;
  trackedCards.add(card);
  ensurePanel(card);
  if (intersection) intersection.observe(card);
  else schedule(card);
}

function scan(root = document) {
  if (root instanceof Element && root.matches(".marketplace-card[data-listing-id]")) registerCard(root);
  root.querySelectorAll?.(".marketplace-card[data-listing-id]").forEach(registerCard);
}

scan(document);

new MutationObserver((records) => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node instanceof Element) scan(node);
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  for (const card of [...trackedCards]) {
    if (!card.isConnected) {
      trackedCards.delete(card);
      continue;
    }
    const checkedAt = Number(card.dataset.marketAvailabilityCheckedAt ?? 0);
    if (!checkedAt || Date.now() - checkedAt >= STALE_AFTER_MS) schedule(card, true);
  }
});
