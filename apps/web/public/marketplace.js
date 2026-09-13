const marketStatus = document.querySelector("#market-status");
const marketListings = document.querySelector("#market-listings");
const refreshMarketButton = document.querySelector("#refresh-market");
const sellerAuthState = document.querySelector("#seller-auth-state");
const listingForm = document.querySelector("#listing-form");
const treasureSelect = document.querySelector("#listing-treasure");
const sellerListings = document.querySelector("#seller-listings");

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
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountCents / 100);
  } catch {
    return `${currency} ${(amountCents / 100).toFixed(2)}`;
  }
}

function parseMoneyToCents(value) {
  const cleaned = String(value ?? "").trim();
  const match = cleaned.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error("Enter a price such as 125 or 125.00.");
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0") || 0);
  const cents = whole * 100 + fraction;
  if (!Number.isSafeInteger(cents) || cents < 1) throw new Error("Enter a positive price.");
  return cents;
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

function renderPublicListings(listings) {
  if (!listings.length) {
    marketListings.innerHTML = `<article class="marketplace-empty"><h3>No active offers yet</h3><p>The Street Market is open, but no collector has published an offer.</p></article>`;
    return;
  }
  marketListings.innerHTML = listings.map((listing) => `
    <article class="marketplace-card">
      <div class="marketplace-card-topline">
        <span class="marketplace-badge">${escapeHtml(listing.saleFormat)}</span>
        <span>${escapeHtml(listing.fulfillmentMethod)}</span>
      </div>
      <h3>${escapeHtml(listing.title)}</h3>
      <div class="marketplace-facts">${listingFacts(listing)}</div>
      ${listing.sellerDescription ? `<p>${escapeHtml(listing.sellerDescription)}</p>` : ""}
      <div class="marketplace-price">${escapeHtml(money(listing.amountCents, listing.currency))}</div>
      <p class="marketplace-meta">Quantity offered: ${listing.quantity} · Published ${escapeHtml(new Date(listing.publishedAt).toLocaleString())}</p>
      <details>
        <summary>Publication evidence</summary>
        <code>${escapeHtml(listing.representationSha256)}</code>
        <p>${escapeHtml(listing.transactionMessage)}</p>
      </details>
    </article>
  `).join("");
}

async function loadMarket() {
  marketStatus.textContent = "Refreshing active offers…";
  try {
    const payload = await requestJson("/api/marketplace/listings?limit=100");
    renderPublicListings(payload.listings ?? []);
    marketStatus.textContent = `${payload.listings?.length ?? 0} active offer${payload.listings?.length === 1 ? "" : "s"}. Checkout remains disabled until safeguarded transaction services are built.`;
  } catch (error) {
    marketStatus.textContent = `The market could not be loaded: ${error.message}`;
    marketListings.replaceChildren();
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

listingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = listingForm.querySelector("button[type='submit']");
  const selected = treasureSelect.selectedOptions[0];
  if (!selected) return;
  button.disabled = true;
  sellerAuthState.textContent = "Saving private draft…";
  try {
    const body = {
      treasureId: treasureSelect.value,
      amountCents: parseMoneyToCents(document.querySelector("#listing-price").value),
      currency: document.querySelector("#listing-currency").value,
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

refreshMarketButton.addEventListener("click", loadMarket);

await Promise.all([loadMarket(), loadSeller()]);
