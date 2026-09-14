const statusNode = document.getElementById("observatory-status");
const summaryNode = document.getElementById("observatory-summary");
const categoriesNode = document.getElementById("observatory-categories");
const currenciesNode = document.getElementById("observatory-currencies");
const refreshButton = document.getElementById("observatory-refresh");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currencyFractionDigits(currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

function money(amountCents, currency) {
  if (!Number.isSafeInteger(amountCents)) return "Unavailable";
  const digits = currencyFractionDigits(currency);
  const divisor = 10 ** digits;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountCents / divisor);
  } catch {
    return `${currency} ${(amountCents / divisor).toFixed(digits)}`;
  }
}

function middleRange(group) {
  if (!Number.isSafeInteger(group.medianLowAskCents) || !Number.isSafeInteger(group.medianHighAskCents)) return "Unavailable";
  const low = money(group.medianLowAskCents, group.currency);
  const high = money(group.medianHighAskCents, group.currency);
  return group.medianLowAskCents === group.medianHighAskCents ? low : `${low} – ${high}`;
}

async function fetchSnapshot() {
  const response = await fetch("/api/marketplace/observatory", {
    headers: { accept: "application/json" },
    cache: "no-store"
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || `Observatory request failed (${response.status}).`);
  return body;
}

function renderSummary(snapshot) {
  summaryNode.innerHTML = `
    <article class="observatory-stat"><span>Active supported offers</span><strong>${Number(snapshot.totalActiveListings)}</strong></article>
    <article class="observatory-stat"><span>Completed sales included</span><strong>${snapshot.evidence?.completedSalesIncluded ? "Yes" : "No"}</strong></article>
    <article class="observatory-stat"><span>Cross-currency aggregation</span><strong>${snapshot.evidence?.crossCurrencyPriceAggregation ? "Enabled" : "Never"}</strong></article>
    <article class="observatory-stat"><span>Verified scan ceiling</span><strong>${Number(snapshot.capacity?.maxVerifiedListings ?? 0).toLocaleString()}</strong></article>
  `;
}

function renderCategories(snapshot) {
  const categories = snapshot.activeListingCountsByCategory ?? [];
  categoriesNode.innerHTML = categories.length
    ? categories.map((entry) => `
        <article class="observatory-category-card">
          <strong>${escapeHtml(entry.category)}</strong>
          <span>${Number(entry.count)} active offer${Number(entry.count) === 1 ? "" : "s"}</span>
        </article>
      `).join("")
    : `<article class="marketplace-empty"><h3>No active offers</h3><p>The Observatory has no currently supported listings to count.</p></article>`;
}

function renderCurrencyGroup(group) {
  const categories = group.categories ?? [];
  const rows = categories.map((entry) => `
    <tr>
      <th scope="row">${escapeHtml(entry.category)}</th>
      <td>${Number(entry.listingCount)}</td>
      <td>${escapeHtml(money(entry.minAskCents, group.currency))}</td>
      <td>${escapeHtml(entry.medianLowAskCents === entry.medianHighAskCents
        ? money(entry.medianLowAskCents, group.currency)
        : `${money(entry.medianLowAskCents, group.currency)} – ${money(entry.medianHighAskCents, group.currency)}`)}</td>
      <td>${escapeHtml(money(entry.maxAskCents, group.currency))}</td>
    </tr>
  `).join("");

  return `
    <article class="observatory-currency-card">
      <div class="observatory-currency-heading">
        <div><p class="marketplace-kicker">${escapeHtml(group.currency)}</p><h3>${Number(group.listingCount)} active offer${Number(group.listingCount) === 1 ? "" : "s"}</h3></div>
        <div class="observatory-activity"><span>${Number(group.new24hCount)} new / 24h</span><span>${Number(group.new7dCount)} new / 7d</span></div>
      </div>
      <dl class="observatory-range">
        <div><dt>Lowest ask</dt><dd>${escapeHtml(money(group.minAskCents, group.currency))}</dd></div>
        <div><dt>Middle rank${group.medianLowAskCents === group.medianHighAskCents ? "" : "s"}</dt><dd>${escapeHtml(middleRange(group))}</dd></div>
        <div><dt>Highest ask</dt><dd>${escapeHtml(money(group.maxAskCents, group.currency))}</dd></div>
      </dl>
      ${rows ? `
        <div class="observatory-table-wrap">
          <table>
            <caption>Active asking-price evidence by category in ${escapeHtml(group.currency)}</caption>
            <thead><tr><th>Category</th><th>Offers</th><th>Low</th><th>Middle</th><th>High</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>` : ""}
    </article>
  `;
}

function renderCurrencies(snapshot) {
  const groups = snapshot.currencyGroups ?? [];
  currenciesNode.innerHTML = groups.length
    ? groups.map(renderCurrencyGroup).join("")
    : `<article class="marketplace-empty"><h3>No asking-price ranges yet</h3><p>Currency-specific ranges appear after supported sellers publish active offers.</p></article>`;
}

async function loadObservatory() {
  refreshButton.disabled = true;
  statusNode.textContent = "Verifying the current active market…";
  try {
    const snapshot = await fetchSnapshot();
    renderSummary(snapshot);
    renderCategories(snapshot);
    renderCurrencies(snapshot);
    const generated = new Date(snapshot.generatedAt);
    statusNode.textContent = Number.isFinite(generated.getTime())
      ? `Verified snapshot generated ${generated.toLocaleString()}. Asking-price evidence only; completed sales are not included.`
      : "Verified active-market snapshot loaded. Asking-price evidence only; completed sales are not included.";
  } catch (error) {
    summaryNode.innerHTML = "";
    categoriesNode.innerHTML = "";
    currenciesNode.innerHTML = `<article class="marketplace-empty"><h3>Observatory unavailable</h3><p>${escapeHtml(error.message)}</p></article>`;
    statusNode.textContent = "The Observatory could not publish a verified snapshot. No partial statistics were shown.";
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadObservatory);
loadObservatory();
