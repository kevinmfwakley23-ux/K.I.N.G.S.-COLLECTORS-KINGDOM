const marketListings = document.querySelector("#market-listings");
const watchStatus = document.querySelector("#market-watchlist-status");
const watchList = document.querySelector("#market-watchlist-list");
const sellerProfileForm = document.querySelector("#seller-profile-form");
const sellerProfileStatus = document.querySelector("#seller-profile-status");
const sellerShopName = document.querySelector("#seller-shop-name");
const sellerBio = document.querySelector("#seller-bio");
const sellerPublicLink = document.querySelector("#seller-public-link");

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

function currencyFractionDigits(currency) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

function money(amountCents, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountCents / (10 ** currencyFractionDigits(currency)));
  } catch {
    return `${currency} ${amountCents}`;
  }
}

function sellerLink(listing) {
  if (!listing?.sellerStorefrontAvailable || !listing.seller?.id) return "Seller storefront unavailable";
  const href = `/marketplace-seller.html?id=${encodeURIComponent(listing.seller.id)}`;
  return `<a href="${escapeHtml(href)}">${escapeHtml(listing.seller.shopName)}</a>`;
}

function renderWatchlist(payload) {
  const items = payload.items ?? [];
  if (!items.length) {
    watchList.innerHTML = `<p class="marketplace-form-note">Your watchlist is empty. Use “Watch listing” on an active offer to keep it here privately.</p>`;
    return;
  }
  watchList.innerHTML = items.map((item) => item.available && item.listing ? `
    <article class="marketplace-watch-card">
      <div>
        <strong>${escapeHtml(item.listing.title)}</strong>
        <small>${sellerLink(item.listing)} · ${escapeHtml(money(item.listing.amountCents, item.listing.currency))}</small>
      </div>
      <button type="button" class="marketplace-secondary" data-unwatch-listing-id="${escapeHtml(item.listingId)}">Remove</button>
    </article>
  ` : `
    <article class="marketplace-watch-card marketplace-watch-card-unavailable">
      <div>
        <strong>Offer no longer active</strong>
        <small>This private bookmark remains only as an unavailable tombstone; withdrawn offer details are not republished.</small>
      </div>
      <button type="button" class="marketplace-secondary" data-unwatch-listing-id="${escapeHtml(item.listingId)}">Remove</button>
    </article>
  `).join("");
}

async function loadWatchlist() {
  if (!watchStatus || !watchList) return;
  watchStatus.textContent = "Checking your private watchlist…";
  try {
    const payload = await requestJson("/api/marketplace/watchlist?limit=100");
    renderWatchlist(payload);
    watchStatus.textContent = `${payload.count ?? 0} watched listing${Number(payload.count) === 1 ? "" : "s"}. Watchlist alerts are not enabled yet.`;
  } catch (error) {
    watchList.replaceChildren();
    if (error.code === "unauthorized") {
      watchStatus.innerHTML = `Sign in through the <a href="/auth.html">Royal Gate</a> to use your private watchlist. Watchlist alerts are not enabled yet.`;
      return;
    }
    watchStatus.textContent = `Watchlist could not be loaded: ${error.message}`;
  }
}

async function loadSellerProfile() {
  if (!sellerProfileForm || !sellerProfileStatus) return;
  sellerProfileStatus.textContent = "Checking your public storefront profile…";
  try {
    const payload = await requestJson("/api/marketplace/seller-profile");
    const seller = payload.seller;
    sellerShopName.value = seller.shopName ?? "";
    sellerBio.value = seller.bio ?? "";
    sellerProfileForm.hidden = false;
    sellerPublicLink.hidden = false;
    sellerPublicLink.href = `/marketplace-seller.html?id=${encodeURIComponent(seller.id)}`;
    sellerProfileStatus.textContent = `${seller.activeListingCount} active storefront listing${seller.activeListingCount === 1 ? "" : "s"}. Verified-purchase ratings are not enabled until real completed transaction and delivery evidence exists.`;
  } catch (error) {
    sellerProfileForm.hidden = true;
    sellerPublicLink.hidden = true;
    if (error.code === "unauthorized") {
      sellerProfileStatus.textContent = "Sign in to configure your public Marketplace storefront.";
      return;
    }
    sellerProfileStatus.textContent = `Storefront profile could not be loaded: ${error.message}`;
  }
}

marketListings?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-watch-listing-id]");
  if (!button) return;
  button.disabled = true;
  const listingId = button.dataset.watchListingId;
  try {
    const payload = await requestJson("/api/marketplace/watchlist", {
      method: "POST",
      body: JSON.stringify({ listingId })
    });
    button.textContent = payload.item?.created ? "Watching" : "Already watched";
    await loadWatchlist();
  } catch (error) {
    if (error.code === "unauthorized") {
      watchStatus.innerHTML = `Sign in through the <a href="/auth.html">Royal Gate</a> to watch Marketplace listings.`;
    } else {
      watchStatus.textContent = `Listing was not added to your watchlist: ${error.message}`;
    }
    button.disabled = false;
  }
});

watchList?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-unwatch-listing-id]");
  if (!button) return;
  button.disabled = true;
  try {
    await requestJson(`/api/marketplace/watchlist/${encodeURIComponent(button.dataset.unwatchListingId)}`, { method: "DELETE" });
    await loadWatchlist();
  } catch (error) {
    watchStatus.textContent = `Watchlist item was not removed: ${error.message}`;
    button.disabled = false;
  }
});

sellerProfileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = sellerProfileForm.querySelector("button[type='submit']");
  button.disabled = true;
  sellerProfileStatus.textContent = "Saving storefront profile…";
  try {
    const payload = await requestJson("/api/marketplace/seller-profile", {
      method: "PATCH",
      body: JSON.stringify({ shopName: sellerShopName.value, bio: sellerBio.value })
    });
    const seller = payload.seller;
    sellerPublicLink.href = `/marketplace-seller.html?id=${encodeURIComponent(seller.id)}`;
    sellerProfileStatus.textContent = "Storefront profile saved. Reputation remains unavailable until verified completed Marketplace transactions exist.";
  } catch (error) {
    sellerProfileStatus.textContent = `Storefront profile was not saved: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});

await Promise.all([loadWatchlist(), loadSellerProfile()]);
