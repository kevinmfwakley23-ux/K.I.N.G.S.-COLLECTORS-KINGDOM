const marketListings = document.querySelector("#market-listings");
const watchStatus = document.querySelector("#market-watchlist-status");
const watchList = document.querySelector("#market-watchlist-list");
const sellerProfileForm = document.querySelector("#seller-profile-form");
const sellerProfileStatus = document.querySelector("#seller-profile-status");
const sellerPublicId = document.querySelector("#seller-public-id");
const sellerPublicIdNote = document.querySelector("#seller-public-id-note");
const sellerShopName = document.querySelector("#seller-shop-name");
const sellerBio = document.querySelector("#seller-bio");
const sellerPublished = document.querySelector("#seller-published");
const sellerPublicLink = document.querySelector("#seller-public-link");
let currentSellerProfile = null;

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
  if (!listing?.sellerStorefrontAvailable || !listing.seller?.id) return "Seller storefront not published";
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
        <small>This private bookmark remains only as an unavailable tombstone; withdrawn or unsupported offer details are not republished.</small>
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
    watchStatus.textContent = `${payload.count ?? 0} watched listing${Number(payload.count) === 1 ? "" : "s"}. Watching creates no purchase commitment; alerts are not enabled yet.`;
  } catch (error) {
    watchList.replaceChildren();
    if (error.code === "unauthorized") {
      watchStatus.innerHTML = `Sign in through the <a href="/auth.html">Royal Gate</a> to use your private watchlist. Watchlist alerts are not enabled yet.`;
      return;
    }
    watchStatus.textContent = `Watchlist could not be loaded: ${error.message}`;
  }
}

function renderSellerProfile(seller) {
  currentSellerProfile = seller;
  sellerProfileForm.hidden = false;
  if (!seller) {
    sellerPublicId.disabled = false;
    sellerPublicId.required = true;
    sellerPublicId.value = "";
    sellerPublicIdNote.textContent = "Choose this once. It becomes part of your public storefront link and cannot be changed after creation.";
    sellerShopName.value = "";
    sellerBio.value = "";
    sellerPublished.checked = false;
    sellerPublicLink.hidden = true;
    sellerProfileStatus.textContent = "No Marketplace storefront profile exists yet. Create one privately, then publish only when you want it visible.";
    return;
  }

  sellerPublicId.value = seller.id ?? "";
  sellerPublicId.disabled = true;
  sellerPublicId.required = false;
  sellerPublicIdNote.textContent = "This public storefront ID is permanent so saved links remain stable.";
  sellerShopName.value = seller.shopName ?? "";
  sellerBio.value = seller.bio ?? "";
  sellerPublished.checked = seller.isPublic === true;
  sellerPublicLink.hidden = !seller.isPublic;
  if (seller.isPublic && seller.publicUrl) sellerPublicLink.href = seller.publicUrl;
  sellerProfileStatus.textContent = seller.isPublic
    ? `${seller.activeListingCount} active storefront listing${seller.activeListingCount === 1 ? "" : "s"}. Your seller-selected profile is public; verified-purchase ratings are not enabled yet.`
    : `Storefront profile saved privately with ${seller.activeListingCount} active listing${seller.activeListingCount === 1 ? "" : "s"}. Check “Publish” and save when you want this profile connected publicly.`;
}

async function loadSellerProfile() {
  if (!sellerProfileForm || !sellerProfileStatus) return;
  sellerProfileStatus.textContent = "Checking your storefront profile…";
  try {
    const payload = await requestJson("/api/marketplace/seller-profile");
    renderSellerProfile(payload.seller ?? null);
  } catch (error) {
    sellerProfileForm.hidden = true;
    sellerPublicLink.hidden = true;
    if (error.code === "unauthorized") {
      sellerProfileStatus.textContent = "Sign in to create or manage an optional public Marketplace storefront.";
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
  sellerProfileStatus.textContent = "Saving storefront settings…";
  try {
    const body = {
      shopName: sellerShopName.value,
      bio: sellerBio.value,
      published: sellerPublished.checked
    };
    if (!currentSellerProfile) body.publicId = sellerPublicId.value;
    const payload = await requestJson("/api/marketplace/seller-profile", {
      method: "PATCH",
      body: JSON.stringify(body)
    });
    renderSellerProfile(payload.seller);
    sellerProfileStatus.textContent = payload.seller.isPublic
      ? "Storefront settings saved and explicitly published. Seller verification, ratings, checkout, and ownership transfer are not implied."
      : "Storefront settings saved privately. Nothing from this profile is public until you explicitly publish it.";
  } catch (error) {
    sellerProfileStatus.textContent = `Storefront settings were not saved: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});

await Promise.all([loadWatchlist(), loadSellerProfile()]);
