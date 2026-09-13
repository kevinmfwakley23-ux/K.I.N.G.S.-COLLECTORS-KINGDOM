const panel = document.querySelector("#market-saved-searches");
const status = document.querySelector("#market-saved-search-status");
const form = document.querySelector("#market-save-search-form");
const nameInput = document.querySelector("#market-save-search-name");
const list = document.querySelector("#market-saved-search-list");

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

function currentFiltersFromUrl() {
  const parameters = new URL(window.location.href).searchParams;
  const numberOrNull = (key) => {
    const raw = parameters.get(key);
    if (raw === null || raw === "") return null;
    const numeric = Number(raw);
    return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
  };
  return {
    query: parameters.get("q") || null,
    category: parameters.get("category") || null,
    currency: parameters.get("currency") || null,
    fulfillmentMethod: parameters.get("fulfillment") || null,
    minAmountCents: numberOrNull("minAmountCents"),
    maxAmountCents: numberOrNull("maxAmountCents"),
    sort: parameters.get("sort") || "newest"
  };
}

function urlForSavedSearch(savedSearch) {
  const url = new URL(window.location.href);
  url.search = "";
  const filters = savedSearch.filters ?? {};
  if (filters.query) url.searchParams.set("q", filters.query);
  if (filters.category) url.searchParams.set("category", filters.category);
  if (filters.currency) url.searchParams.set("currency", filters.currency);
  if (filters.fulfillmentMethod) url.searchParams.set("fulfillment", filters.fulfillmentMethod);
  if (filters.minAmountCents !== null && filters.minAmountCents !== undefined) url.searchParams.set("minAmountCents", String(filters.minAmountCents));
  if (filters.maxAmountCents !== null && filters.maxAmountCents !== undefined) url.searchParams.set("maxAmountCents", String(filters.maxAmountCents));
  if (filters.sort && filters.sort !== "newest") url.searchParams.set("sort", filters.sort);
  url.hash = "active-market-title";
  return `${url.pathname}${url.search}${url.hash}`;
}

function describe(savedSearch) {
  const filters = savedSearch.filters ?? {};
  return [
    filters.query ? `“${filters.query}”` : null,
    filters.category,
    filters.currency,
    filters.fulfillmentMethod,
    filters.sort && filters.sort !== "newest" ? filters.sort : null
  ].filter(Boolean).join(" · ") || "All active offers";
}

function render(savedSearches) {
  if (!savedSearches.length) {
    list.innerHTML = `<p class="marketplace-form-note">You have no saved Street Market searches yet.</p>`;
    return;
  }
  list.innerHTML = savedSearches.map((savedSearch) => `
    <article class="marketplace-saved-search-card">
      <div>
        <strong>${escapeHtml(savedSearch.name)}</strong>
        <small>${escapeHtml(describe(savedSearch))}</small>
      </div>
      <div class="marketplace-saved-search-actions">
        <button type="button" data-action="run" data-id="${escapeHtml(savedSearch.id)}">Run live search</button>
        <button type="button" class="marketplace-secondary" data-action="delete" data-id="${escapeHtml(savedSearch.id)}">Delete</button>
      </div>
    </article>
  `).join("");
}

async function loadSavedSearches() {
  if (!panel) return;
  status.textContent = "Checking saved searches…";
  try {
    const payload = await requestJson("/api/marketplace/saved-searches");
    form.hidden = false;
    render(payload.savedSearches ?? []);
    const maximum = payload.capabilities?.maxSavedSearches;
    status.textContent = payload.capabilities?.notificationsAvailable
      ? `Saved searches are private to your Kingdom account.${maximum ? ` Up to ${maximum} may be kept.` : ""}`
      : `Saved searches are private definitions that rerun the current market.${maximum ? ` Up to ${maximum} may be kept.` : ""} Automatic alerts are not enabled yet.`;
  } catch (error) {
    form.hidden = true;
    list.replaceChildren();
    if (error.code === "unauthorized") {
      status.innerHTML = `Sign in through the <a href="/auth.html">Royal Gate</a> to save private Street Market searches. Search alerts are not enabled yet.`;
      return;
    }
    status.textContent = `Saved searches could not be loaded: ${error.message}`;
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  status.textContent = "Saving current search…";
  try {
    await requestJson("/api/marketplace/saved-searches", {
      method: "POST",
      body: JSON.stringify({
        name: nameInput.value,
        filters: currentFiltersFromUrl()
      })
    });
    form.reset();
    await loadSavedSearches();
  } catch (error) {
    status.textContent = `Search not saved: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});

list?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action][data-id]");
  if (!button) return;
  button.disabled = true;
  const id = button.dataset.id;
  try {
    if (button.dataset.action === "delete") {
      await requestJson(`/api/marketplace/saved-searches/${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadSavedSearches();
      return;
    }
    if (button.dataset.action === "run") {
      const payload = await requestJson(`/api/marketplace/saved-searches/${encodeURIComponent(id)}`);
      window.location.assign(urlForSavedSearch(payload.savedSearch));
    }
  } catch (error) {
    status.textContent = `Saved-search action failed: ${error.message}`;
    button.disabled = false;
  }
});

await loadSavedSearches();
