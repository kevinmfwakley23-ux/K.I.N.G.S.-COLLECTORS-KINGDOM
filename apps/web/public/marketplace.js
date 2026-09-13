const marketStatus = document.querySelector("#market-status");
const marketListings = document.querySelector("#market-listings");
const refreshMarketButton = document.querySelector("#refresh-market");
const loadMoreMarketButton = document.querySelector("#load-more-market");
const discoveryForm = document.querySelector("#market-discovery-form");
const marketQuery = document.querySelector("#market-query");
const marketCategory = document.querySelector("#market-category");
const marketCurrency = document.querySelector("#market-currency");
const marketFulfillment = document.querySelector("#market-fulfillment");
const marketSort = document.querySelector("#market-sort");
const marketMinPrice = document.querySelector("#market-min-price");
const marketMaxPrice = document.querySelector("#market-max-price");
const marketPriceGuidance = document.querySelector("#market-price-guidance");
const marketActiveFilters = document.querySelector("#market-active-filters");
const clearMarketFiltersButton = document.querySelector("#clear-market-filters");
const sellerAuthState = document.querySelector("#seller-auth-state");
const listingForm = document.querySelector("#listing-form");
const treasureSelect = document.querySelector("#listing-treasure");
const sellerListings = document.querySelector("#seller-listings");

const MARKET_PAGE_SIZE = 24;
let marketNextCursor = null;
let marketShownCount = 0;

function text(value) {
  return String(value ?? "");
}

function escapeHtml(value) {
  return text(value).replace(/[&<>'"]/g, (character) => ({
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
    error.details = payload.details;
    throw error;
  }
  return payload;
}

function money(amountCents, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountCents / (10 ** currencyFractionDigits(currency)));
  } catch {
    return `${currency} ${amountCents}`;
  }
}

function currencyFractionDigits(currency) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

function parseMoneyToMinorUnits(value, currency, { allowZero = false } = {}) {
  const cleaned = String(value ?? "").trim();
  const digits = currencyFractionDigits(currency);
  const pattern = digits === 0 ? /^(\d+)$/ : new RegExp(`^(\\d+)(?:\\.(\\d{1,${digits}}))?$`);
  const match = cleaned.match(pattern);
  const example = digits === 0 ? "125" : `125.${"0".repeat(digits)}`;
  if (!match) throw new Error(`Enter a price such as ${example} for ${currency}.`);
  const whole = Number(match[1]);
  const fraction = digits === 0 ? 0 : Number((match[2] ?? "").padEnd(digits, "0") || 0);
  const units = whole * (10 ** digits) + fraction;
  if (!Number.isSafeInteger(units) || units < (allowZero ? 0 : 1)) {
    throw new Error(allowZero ? "Enter a non-negative price." : "Enter a positive price.");
  }
  return units;
}

function formatMinorUnitsForInput(amount, currency) {
  if (amount === null || amount === undefined || amount === "") return "";
  const digits = currencyFractionDigits(currency);
  const divisor = 10 ** digits;
  return digits === 0 ? String(amount) : (Number(amount) / divisor).toFixed(digits);
}

function listingFacts(listing) {
  return [
    listing.category,
    listing.manufacturer,
    listing.series,
    listing.variant,
    listing.conditionLabel
  ].filter(Boolean).map((value) => `<span>${escapeHtml(value)}</span>`).join("");
}

function sellerLine(listing) {
  if (!listing.sellerStorefrontAvailable || !listing.seller?.id) {
    return `<p class="marketplace-meta">Seller storefront unavailable for this listing. Verified-purchase feedback is not enabled yet.</p>`;
  }
  const href = `/marketplace-seller.html?id=${encodeURIComponent(listing.seller.id)}`;
  return `<p class="marketplace-meta">Seller: <a href="${escapeHtml(href)}">${escapeHtml(listing.seller.shopName)}</a> · Verified-purchase feedback is not enabled yet.</p>`;
}

function listingCards(listings) {
  return listings.map((listing) => `
    <article class="marketplace-card" data-listing-id="${escapeHtml(listing.id)}">
      <div class="marketplace-card-topline">
        <span class="marketplace-badge">${escapeHtml(listing.saleFormat)}</span>
        <span>${escapeHtml(listing.fulfillmentMethod)}</span>
      </div>
      <h3>${escapeHtml(listing.title)}</h3>
      ${sellerLine(listing)}
      <div class="marketplace-facts">${listingFacts(listing)}</div>
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

function renderPublicListings(listings, hasFilters = false, { append = false } = {}) {
  if (!listings.length) {
    if (append) return;
    marketListings.innerHTML = hasFilters
      ? `<article class="marketplace-empty"><h3>No matching offers</h3><p>No currently supported active listing matches these filters. Clear or broaden the search to inspect the rest of the Street Market.</p></article>`
      : `<article class="marketplace-empty"><h3>No active offers yet</h3><p>The Street Market is open, but no collector has published an offer.</p></article>`;
    return;
  }
  const cards = listingCards(listings);
  if (append) marketListings.insertAdjacentHTML("beforeend", cards);
  else marketListings.innerHTML = cards;
}

function replaceFacetOptions(select, facetLabel, facets, selectedValue) {
  const selected = selectedValue ?? select.value;
  select.innerHTML = `<option value="">${escapeHtml(facetLabel)}</option>${facets.map((facet) => `
    <option value="${escapeHtml(facet.value)}">${escapeHtml(facet.value)} (${Number(facet.count)})</option>
  `).join("")}`;
  if ([...select.options].some((option) => option.value === selected)) select.value = selected;
}

function fulfillmentLabel(value) {
  return ({
    "shipping": "Shipping",
    "local-pickup": "Local pickup",
    "shipping-or-pickup": "Shipping or pickup"
  })[value] ?? value;
}

function replaceFulfillmentFacetOptions(facets, selectedValue) {
  const selected = selectedValue ?? marketFulfillment.value;
  marketFulfillment.innerHTML = `<option value="">Any fulfillment</option>${facets.map((facet) => `
    <option value="${escapeHtml(facet.value)}">${escapeHtml(fulfillmentLabel(facet.value))} (${Number(facet.count)})</option>
  `).join("")}`;
  if ([...marketFulfillment.options].some((option) => option.value === selected)) marketFulfillment.value = selected;
}

function syncPriceControls() {
  const hasCurrency = Boolean(marketCurrency.value);
  marketMinPrice.disabled = !hasCurrency;
  marketMaxPrice.disabled = !hasCurrency;
  for (const option of marketSort.options) {
    if (["price-asc", "price-desc"].includes(option.value)) option.disabled = !hasCurrency;
  }
  if (!hasCurrency && ["price-asc", "price-desc"].includes(marketSort.value)) marketSort.value = "newest";
  if (!hasCurrency) {
    marketMinPrice.value = "";
    marketMaxPrice.value = "";
  }
  marketPriceGuidance.textContent = hasCurrency
    ? `Price filtering and ordering are scoped to ${marketCurrency.value}. Other currencies are excluded whenever a price range or price sort is used.`
    : "Choose a currency to filter or sort by price. The Kingdom never ranks unlike currencies as though they were equivalent.";
}

function filtersFromControls() {
  const filters = {
    query: marketQuery.value.trim() || null,
    category: marketCategory.value || null,
    currency: marketCurrency.value || null,
    fulfillmentMethod: marketFulfillment.value || null,
    sort: marketSort.value || "newest",
    minAmountCents: null,
    maxAmountCents: null
  };
  if (filters.currency && marketMinPrice.value.trim()) {
    filters.minAmountCents = parseMoneyToMinorUnits(marketMinPrice.value, filters.currency, { allowZero: true });
  }
  if (filters.currency && marketMaxPrice.value.trim()) {
    filters.maxAmountCents = parseMoneyToMinorUnits(marketMaxPrice.value, filters.currency, { allowZero: true });
  }
  return filters;
}

function queryStringForFilters(filters, { cursor = null } = {}) {
  const parameters = new URLSearchParams();
  if (filters.query) parameters.set("q", filters.query);
  if (filters.category) parameters.set("category", filters.category);
  if (filters.currency) parameters.set("currency", filters.currency);
  if (filters.fulfillmentMethod) parameters.set("fulfillment", filters.fulfillmentMethod);
  if (filters.minAmountCents !== null) parameters.set("minAmountCents", String(filters.minAmountCents));
  if (filters.maxAmountCents !== null) parameters.set("maxAmountCents", String(filters.maxAmountCents));
  if (filters.sort && filters.sort !== "newest") parameters.set("sort", filters.sort);
  parameters.set("pageSize", String(MARKET_PAGE_SIZE));
  if (cursor) parameters.set("cursor", cursor);
  return parameters;
}

function hasMeaningfulFilters(filters) {
  return Boolean(
    filters.query || filters.category || filters.currency || filters.fulfillmentMethod ||
    filters.minAmountCents !== null || filters.maxAmountCents !== null || filters.sort !== "newest"
  );
}

function renderActiveFilters(filters) {
  const labels = [];
  if (filters.query) labels.push(`Search: ${filters.query}`);
  if (filters.category) labels.push(`Category: ${filters.category}`);
  if (filters.currency) labels.push(`Currency: ${filters.currency}`);
  if (filters.fulfillmentMethod) labels.push(`Fulfillment: ${fulfillmentLabel(filters.fulfillmentMethod)}`);
  if (filters.minAmountCents !== null) labels.push(`Min: ${money(filters.minAmountCents, filters.currency)}`);
  if (filters.maxAmountCents !== null) labels.push(`Max: ${money(filters.maxAmountCents, filters.currency)}`);
  if (filters.sort !== "newest") labels.push(`Sort: ${marketSort.selectedOptions[0]?.textContent ?? filters.sort}`);
  marketActiveFilters.innerHTML = labels.map((label) => `<span>${escapeHtml(label)}</span>`).join("");
}

function updateShareableUrl(filters) {
  const url = new URL(window.location.href);
  for (const key of ["q", "category", "currency", "fulfillment", "minAmountCents", "maxAmountCents", "sort", "pageSize", "cursor"]) {
    url.searchParams.delete(key);
  }
  const parameters = queryStringForFilters(filters);
  parameters.delete("pageSize");
  for (const [key, value] of parameters) url.searchParams.set(key, value);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function loadControlsFromUrl() {
  const parameters = new URL(window.location.href).searchParams;
  marketQuery.value = parameters.get("q") ?? "";
  marketCategory.dataset.initialValue = parameters.get("category") ?? "";
  marketCurrency.dataset.initialValue = (parameters.get("currency") ?? "").toUpperCase();
  marketFulfillment.dataset.initialValue = parameters.get("fulfillment") ?? "";
  marketSort.value = parameters.get("sort") ?? "newest";
  marketMinPrice.dataset.initialMinor = parameters.get("minAmountCents") ?? "";
  marketMaxPrice.dataset.initialMinor = parameters.get("maxAmountCents") ?? "";
}

function applyInitialFacetValues(payload) {
  const category = marketCategory.dataset.initialValue ?? marketCategory.value;
  const currency = marketCurrency.dataset.initialValue ?? marketCurrency.value;
  const fulfillment = marketFulfillment.dataset.initialValue ?? marketFulfillment.value;
  replaceFacetOptions(marketCategory, "All categories", payload.facets?.categories ?? [], category);
  replaceFacetOptions(marketCurrency, "All currencies", payload.facets?.currencies ?? [], currency);
  replaceFulfillmentFacetOptions(payload.facets?.fulfillmentMethods ?? [], fulfillment);
  delete marketCategory.dataset.initialValue;
  delete marketCurrency.dataset.initialValue;
  delete marketFulfillment.dataset.initialValue;
  syncPriceControls();
  const initialMin = marketMinPrice.dataset.initialMinor;
  const initialMax = marketMaxPrice.dataset.initialMinor;
  if (marketCurrency.value) {
    if (initialMin) marketMinPrice.value = formatMinorUnitsForInput(Number(initialMin), marketCurrency.value);
    if (initialMax) marketMaxPrice.value = formatMinorUnitsForInput(Number(initialMax), marketCurrency.value);
  }
  delete marketMinPrice.dataset.initialMinor;
  delete marketMaxPrice.dataset.initialMinor;
}

function syncLoadMore(payload) {
  marketNextCursor = payload.pageInfo?.nextCursor ?? null;
  if (loadMoreMarketButton) {
    loadMoreMarketButton.hidden = !marketNextCursor;
    loadMoreMarketButton.disabled = false;
  }
}

async function loadMarket({ preserveUrl = false, cursor = null, append = false } = {}) {
  marketStatus.textContent = append ? "Loading more active offers…" : "Refreshing active offers…";
  if (append && loadMoreMarketButton) loadMoreMarketButton.disabled = true;
  try {
    const filters = filtersFromControls();
    const parameters = queryStringForFilters(filters, { cursor });
    const payload = await requestJson(`/api/marketplace/listings?${parameters.toString()}`);
    const firstFacetLoad = marketCategory.dataset.initialValue !== undefined || marketCurrency.dataset.initialValue !== undefined;
    if (firstFacetLoad) applyInitialFacetValues(payload);
    else if (!append) {
      replaceFacetOptions(marketCategory, "All categories", payload.facets?.categories ?? [], filters.category);
      replaceFacetOptions(marketCurrency, "All currencies", payload.facets?.currencies ?? [], filters.currency);
      replaceFulfillmentFacetOptions(payload.facets?.fulfillmentMethods ?? [], filters.fulfillmentMethod);
      syncPriceControls();
    }
    const currentFilters = filtersFromControls();
    const pageListings = payload.listings ?? [];
    renderPublicListings(pageListings, hasMeaningfulFilters(currentFilters), { append });
    renderActiveFilters(currentFilters);
    marketShownCount = append ? marketShownCount + pageListings.length : pageListings.length;
    syncLoadMore(payload);
    const more = payload.pageInfo?.hasNext ? " More matching offers are available." : "";
    marketStatus.textContent = hasMeaningfulFilters(currentFilters)
      ? `${marketShownCount} matching offer${marketShownCount === 1 ? "" : "s"} loaded.${more} Checkout remains disabled.`
      : `${marketShownCount} active offer${marketShownCount === 1 ? "" : "s"} loaded.${more} Checkout remains disabled until safeguarded transaction services are built.`;
    if (!preserveUrl && !append) updateShareableUrl(currentFilters);
  } catch (error) {
    marketStatus.textContent = `The market could not be loaded: ${error.message}`;
    if (!append) marketListings.replaceChildren();
    if (loadMoreMarketButton) loadMoreMarketButton.disabled = false;
  }
}

function renderTreasureOptions(treasures) {
  treasureSelect.innerHTML = treasures.map((treasure) => `
    <option value="${escapeHtml(treasure.id)}" data-quantity="${Number(treasure.quantity)}">
      ${escapeHtml(treasure.title)} · ${escapeHtml(treasure.category)} · qty ${Number(treasure.quantity)}
    </option>
  `).join("");
  listingForm.querySelector("button[type='submit']").disabled = treasures.length === 0;
}

function sellerListingCard(listing) {
  const publishControls = listing.state === "draft" ? `
    <fieldset class="marketplace-attestations" data-attestations-for="${escapeHtml(listing.id)}">
      <legend>Required before publication</legend>
      <label><input type="checkbox" data-attest="possession"> I physically possess this listed item.</label>
      <label><input type="checkbox" data-attest="right"> I have the right to sell this item.</label>
      <label><input type="checkbox" data-attest="accuracy"> The listing representation is accurate.</label>
      <button type="button" data-action="publish" data-listing-id="${escapeHtml(listing.id)}">Publish offer</button>
    </fieldset>
  ` : "";
  const withdraw = ["draft", "active"].includes(listing.state)
    ? `<button type="button" class="marketplace-secondary" data-action="withdraw" data-listing-id="${escapeHtml(listing.id)}">Withdraw ${listing.state === "draft" ? "draft" : "offer"}</button>`
    : "";
  return `
    <article class="marketplace-seller-card">
      <div class="marketplace-card-topline">
        <span class="marketplace-badge">${escapeHtml(listing.state)}</span>
        <span>${escapeHtml(listing.saleFormat)}</span>
      </div>
      <h3>${escapeHtml(listing.title)}</h3>
      <p><strong>${escapeHtml(money(listing.amountCents, listing.currency))}</strong> · Qty ${listing.quantity} · ${escapeHtml(listing.fulfillmentMethod)}</p>
      ${listing.sellerDescription ? `<p>${escapeHtml(listing.sellerDescription)}</p>` : ""}
      ${listing.representationSha256 ? `<p class="marketplace-meta">Locked representation: <code>${escapeHtml(listing.representationSha256)}</code></p>` : ""}
      ${publishControls}
      ${withdraw}
    </article>
  `;
}

function renderSellerListings(listings) {
  sellerListings.innerHTML = listings.length
    ? `<h3>Your listings</h3>${listings.map(sellerListingCard).join("")}`
    : `<div class="marketplace-empty"><h3>No listings yet</h3><p>Create a private draft from one of your active Vault treasures.</p></div>`;
}

async function loadSeller() {
  try {
    const account = await requestJson("/api/auth/me");
    sellerAuthState.innerHTML = `Signed in as <strong>${escapeHtml(account.account.displayName || account.account.email || "Collector")}</strong>. Drafts stay private until you explicitly publish them.`;
    listingForm.hidden = false;
    const [vault, mine] = await Promise.all([
      requestJson("/api/vault/treasures?limit=100"),
      requestJson("/api/marketplace/my-listings?limit=100")
    ]);
    renderTreasureOptions(vault.treasures ?? []);
    renderSellerListings(mine.listings ?? []);
  } catch (error) {
    if (error.code === "unauthorized") {
      sellerAuthState.innerHTML = `Sign in through the <a href="/auth.html">Royal Gate</a> to open your merchant stall and create Vault-linked listing drafts.`;
      listingForm.hidden = true;
      sellerListings.replaceChildren();
      return;
    }
    sellerAuthState.textContent = `Your merchant stall could not be loaded: ${error.message}`;
  }
}

discoveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadMarket();
});

marketCurrency.addEventListener("change", () => {
  syncPriceControls();
});

for (const control of [marketCategory, marketCurrency, marketFulfillment, marketSort]) {
  control.addEventListener("change", async () => {
    syncPriceControls();
    await loadMarket();
  });
}

clearMarketFiltersButton.addEventListener("click", async () => {
  discoveryForm.reset();
  marketCategory.value = "";
  marketCurrency.value = "";
  marketFulfillment.value = "";
  marketSort.value = "newest";
  marketMinPrice.value = "";
  marketMaxPrice.value = "";
  syncPriceControls();
  await loadMarket();
});

listingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = listingForm.querySelector("button[type='submit']");
  const selected = treasureSelect.selectedOptions[0];
  if (!selected) return;
  button.disabled = true;
  sellerAuthState.textContent = "Saving private draft…";
  try {
    const currency = document.querySelector("#listing-currency").value.trim().toUpperCase();
    const body = {
      treasureId: treasureSelect.value,
      amountCents: parseMoneyToMinorUnits(document.querySelector("#listing-price").value, currency),
      currency,
      quantity: Number(document.querySelector("#listing-quantity").value),
      fulfillmentMethod: document.querySelector("#listing-fulfillment").value,
      sellerDescription: document.querySelector("#listing-description").value
    };
    await requestJson("/api/marketplace/listings", { method: "POST", body: JSON.stringify(body) });
    listingForm.reset();
    document.querySelector("#listing-currency").value = "USD";
    document.querySelector("#listing-quantity").value = "1";
    sellerAuthState.textContent = "Private draft created. It is not public until you complete all three publication attestations.";
    await loadSeller();
  } catch (error) {
    sellerAuthState.textContent = `Draft not created: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});

sellerListings.addEventListener("change", (event) => {
  if (!event.target.matches("[data-attest]")) return;
  const fieldset = event.target.closest("fieldset");
  const button = fieldset?.querySelector("[data-action='publish']");
  if (!button) return;
  button.disabled = [...fieldset.querySelectorAll("[data-attest]")].some((input) => !input.checked);
});

sellerListings.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const listingId = button.dataset.listingId;
  button.disabled = true;
  try {
    if (button.dataset.action === "publish") {
      const fieldset = button.closest("fieldset");
      const checks = Object.fromEntries([...fieldset.querySelectorAll("[data-attest]")].map((input) => [input.dataset.attest, input.checked]));
      if (!checks.possession || !checks.right || !checks.accuracy) throw new Error("Complete all three seller attestations before publishing.");
      await requestJson(`/api/marketplace/listings/${encodeURIComponent(listingId)}/publish`, {
        method: "POST",
        body: JSON.stringify({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true })
      });
      sellerAuthState.textContent = "Offer published with an immutable representation hash.";
    } else if (button.dataset.action === "withdraw") {
      await requestJson(`/api/marketplace/listings/${encodeURIComponent(listingId)}/withdraw`, {
        method: "POST",
        body: JSON.stringify({})
      });
      sellerAuthState.textContent = "Listing withdrawn. Vault ownership was not changed.";
    }
    await Promise.all([loadSeller(), loadMarket()]);
  } catch (error) {
    sellerAuthState.textContent = `Marketplace action failed: ${error.message}`;
    button.disabled = false;
  }
});

if (loadMoreMarketButton) {
  loadMoreMarketButton.addEventListener("click", () => {
    if (!marketNextCursor) return;
    loadMarket({ preserveUrl: true, cursor: marketNextCursor, append: true });
  });
}

refreshMarketButton.addEventListener("click", () => loadMarket({ preserveUrl: true }));

loadControlsFromUrl();
await Promise.all([loadMarket({ preserveUrl: true }), loadSeller()]);
