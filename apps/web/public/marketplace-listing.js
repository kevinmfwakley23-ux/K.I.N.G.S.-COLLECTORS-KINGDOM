const title = document.querySelector("#listing-detail-title");
const seller = document.querySelector("#listing-detail-seller");
const status = document.querySelector("#listing-detail-status");
const content = document.querySelector("#listing-detail-content");
const unavailable = document.querySelector("#listing-detail-unavailable");
const topline = document.querySelector("#listing-detail-topline");
const facts = document.querySelector("#listing-detail-facts");
const description = document.querySelector("#listing-detail-description");
const price = document.querySelector("#listing-detail-price");
const quantity = document.querySelector("#listing-detail-quantity");
const published = document.querySelector("#listing-detail-published");
const representationHash = document.querySelector("#listing-detail-hash");
const transactionMessage = document.querySelector("#listing-detail-transaction-message");
const watchButton = document.querySelector("#watch-listing-detail");
const copyButton = document.querySelector("#copy-listing-link");

let listingId = null;

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
    error.status = response.status;
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

function specificRows(listing) {
  return [
    ["Category", listing.category],
    ["Manufacturer", listing.manufacturer],
    ["Series / set", listing.series],
    ["Variant", listing.variant],
    ["Condition", listing.conditionLabel],
    ["Sale format", listing.saleFormat],
    ["Fulfillment", listing.fulfillmentMethod]
  ].filter(([, value]) => value).map(([label, value]) => `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `).join("");
}

function renderSeller(listing) {
  if (!listing.sellerStorefrontAvailable || !listing.seller?.id) {
    seller.textContent = "Seller storefront unavailable. Verified-purchase feedback is not enabled yet.";
    return;
  }
  const href = `/marketplace-storefront.html?store=${encodeURIComponent(listing.seller.id)}`;
  seller.innerHTML = `Seller: <a href="${escapeHtml(href)}">${escapeHtml(listing.seller.shopName)}</a> · Verified-purchase feedback is not enabled yet.`;
}

function renderListing(listing) {
  title.textContent = listing.title;
  document.title = `${listing.title} · Kingdom Street Market`;
  renderSeller(listing);
  topline.innerHTML = `<span class="marketplace-badge">${escapeHtml(listing.saleFormat)}</span><span>${escapeHtml(listing.fulfillmentMethod)}</span>`;
  facts.innerHTML = `<dl>${specificRows(listing)}</dl>`;
  description.textContent = listing.sellerDescription || "The seller did not provide an additional public description.";
  price.textContent = money(listing.amountCents, listing.currency);
  quantity.textContent = `Quantity offered: ${Number(listing.quantity)}. This quantity is rechecked against the seller's current active Vault record before the listing is returned publicly.`;
  published.textContent = new Date(listing.publishedAt).toLocaleString();
  representationHash.textContent = listing.representationSha256;
  transactionMessage.textContent = listing.transactionMessage;
  watchButton.dataset.listingId = listing.id;
  content.hidden = false;
  unavailable.hidden = true;
  status.textContent = "Offer is currently active and passed the Marketplace representation-integrity and live Vault-support checks.";
}

function showUnavailable(message) {
  content.hidden = true;
  unavailable.hidden = false;
  status.textContent = message;
}

async function loadListing() {
  listingId = new URL(window.location.href).searchParams.get("id");
  if (!listingId) {
    title.textContent = "Listing not specified";
    showUnavailable("No Marketplace listing identifier was supplied in this link.");
    return;
  }
  try {
    const payload = await requestJson(`/api/marketplace/listings/${encodeURIComponent(listingId)}`);
    renderListing(payload.listing);
  } catch (error) {
    title.textContent = "Listing unavailable";
    seller.textContent = "";
    if (error.code === "marketplace_representation_integrity_failure") {
      showUnavailable("The Kingdom refused to display this offer because its published representation failed integrity verification.");
      return;
    }
    if (error.status === 404 || error.code === "marketplace_listing_not_found") {
      showUnavailable("This listing is not a currently supported active offer. It may have been withdrawn, archived, or become unsupported by current Vault quantity.");
      return;
    }
    showUnavailable(`The listing could not be verified: ${error.message}`);
  }
}

watchButton.addEventListener("click", async () => {
  if (!listingId) return;
  watchButton.disabled = true;
  try {
    const payload = await requestJson("/api/marketplace/watchlist", {
      method: "POST",
      body: JSON.stringify({ listingId })
    });
    watchButton.textContent = payload.item?.created ? "Watching" : "Already watched";
    status.textContent = "This listing is in your private watchlist. Watching creates no reservation, purchase commitment, payment, or ownership transfer.";
  } catch (error) {
    if (error.code === "unauthorized") {
      status.innerHTML = `Sign in through the <a href="/auth.html">Royal Gate</a> to watch this listing. Watching creates no purchase commitment.`;
    } else {
      status.textContent = `Listing was not added to your watchlist: ${error.message}`;
    }
    watchButton.disabled = false;
  }
});

copyButton.addEventListener("click", async () => {
  const shareUrl = new URL(window.location.href);
  shareUrl.hash = "";
  try {
    if (!navigator.clipboard?.writeText) throw new Error("clipboard_unavailable");
    await navigator.clipboard.writeText(shareUrl.href);
    copyButton.textContent = "Link copied";
    status.textContent = "Shareable listing link copied. The page will only display the offer while it remains currently supported and integrity-valid.";
  } catch {
    status.textContent = "Automatic clipboard access is unavailable here. Copy the shareable listing URL from your browser address bar.";
  }
});

await loadListing();
