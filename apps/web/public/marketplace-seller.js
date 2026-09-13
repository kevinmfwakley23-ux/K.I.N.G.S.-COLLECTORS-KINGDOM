const title = document.querySelector("#storefront-title");
const bio = document.querySelector("#storefront-bio");
const trust = document.querySelector("#storefront-trust");
const status = document.querySelector("#storefront-status");
const inventory = document.querySelector("#storefront-inventory");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

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
    throw error;
  }
  return payload;
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
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountCents / (10 ** fractionDigits(currency)));
  } catch {
    return `${currency} ${amountCents}`;
  }
}

function facts(listing) {
  return [listing.category, listing.manufacturer, listing.series, listing.variant, listing.conditionLabel]
    .filter(Boolean)
    .map((value) => `<span>${escapeHtml(value)}</span>`)
    .join("");
}

function cards(listings) {
  return listings.map((listing) => `
    <article class="marketplace-card" data-listing-id="${escapeHtml(listing.id)}">
      <div class="marketplace-card-topline">
        <span class="marketplace-badge">${escapeHtml(listing.saleFormat)}</span>
        <span>${escapeHtml(listing.fulfillmentMethod)}</span>
      </div>
      <h3>${escapeHtml(listing.title)}</h3>
      <div class="marketplace-facts">${facts(listing)}</div>
      ${listing.sellerDescription ? `<p>${escapeHtml(listing.sellerDescription)}</p>` : ""}
      <div class="marketplace-price">${escapeHtml(money(listing.amountCents, listing.currency))}</div>
      <p class="marketplace-meta">Quantity offered: ${listing.quantity} · Published ${escapeHtml(new Date(listing.publishedAt).toLocaleString())}</p>
      <div class="marketplace-card-actions">
        <button type="button" class="marketplace-secondary" data-watch-listing-id="${escapeHtml(listing.id)}">Watch listing</button>
      </div>
      <details>
        <summary>Publication evidence</summary>
        <code>${escapeHtml(listing.representationSha256)}</code>
        <p>${escapeHtml(listing.transactionMessage)}</p>
      </details>
    </article>
  `).join("");
}

async function loadStorefront() {
  const parameters = new URL(window.location.href).searchParams;
  const publicId = parameters.get("store") ?? parameters.get("id");
  if (!publicId) {
    title.textContent = "Storefront not specified";
    status.textContent = "Open a seller storefront from a Marketplace listing or a seller's shared storefront link.";
    trust.textContent = "No seller trust data is available without a storefront identifier.";
    return;
  }
  try {
    const payload = await requestJson(`/api/marketplace/sellers/${encodeURIComponent(publicId)}/listings?limit=100`);
    const seller = payload.seller;
    title.textContent = seller.shopName;
    document.title = `${seller.shopName} · Kingdom Street Market`;
    bio.textContent = seller.bio || "This seller has not added a storefront bio.";
    trust.innerHTML = `
      <strong>Marketplace trust status</strong>
      <span>${seller.activeListingCount} currently supported active listing${seller.activeListingCount === 1 ? "" : "s"}.</span>
      <small>${escapeHtml(seller.reputationMessage)}</small>
      <small>Identity verification available: ${seller.identityVerificationAvailable ? "yes" : "no"} · Verified-purchase feedback available: ${seller.verifiedPurchaseFeedbackAvailable ? "yes" : "no"}</small>
    `;
    inventory.innerHTML = payload.listings?.length
      ? cards(payload.listings)
      : `<article class="marketplace-empty"><h3>No active offers</h3><p>This storefront has no currently supported active Marketplace listings.</p></article>`;
    status.textContent = payload.inventoryIsComplete
      ? `${payload.listings?.length ?? 0} current active offer${payload.listings?.length === 1 ? "" : "s"} shown.`
      : `${payload.listings?.length ?? 0} offers shown from a larger active storefront inventory.`;
  } catch (error) {
    title.textContent = "Storefront unavailable";
    bio.textContent = "";
    trust.textContent = "Seller trust information is unavailable.";
    inventory.replaceChildren();
    status.textContent = `This storefront could not be loaded: ${error.message}`;
  }
}

inventory.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-watch-listing-id]");
  if (!button) return;
  button.disabled = true;
  try {
    const payload = await requestJson("/api/marketplace/watchlist", {
      method: "POST",
      body: JSON.stringify({ listingId: button.dataset.watchListingId })
    });
    button.textContent = payload.item?.created ? "Watching" : "Already watched";
  } catch (error) {
    if (error.code === "unauthorized") {
      status.innerHTML = `Sign in through the <a href="/auth.html">Royal Gate</a> to watch this listing.`;
    } else {
      status.textContent = `Listing was not added to your watchlist: ${error.message}`;
    }
    button.disabled = false;
  }
});

await loadStorefront();
