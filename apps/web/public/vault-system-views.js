function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function clearCollectionFilters() {
  const search = document.querySelector("#vault-search");
  const category = document.querySelector("#filter-category");
  const folder = document.querySelector("#filter-folder");
  const location = document.querySelector("#filter-location");
  if (search) search.value = "";
  if (category) category.value = "";
  if (folder) folder.value = "";
  if (location) location.value = "";
}

function applySortedView(sort, label) {
  const form = document.querySelector("#vault-search-form");
  const sortControl = document.querySelector("#sort-treasures");
  const status = document.querySelector("#vault-result-status");
  if (!form || !sortControl) return;
  clearCollectionFilters();
  if ([...sortControl.options].some((option) => option.value === sort)) sortControl.value = sort;
  form.requestSubmit();
  if (status) status.textContent = `Opening ${label}…`;
}

function applyFavoritesView() {
  const form = document.querySelector("#vault-search-form");
  const search = document.querySelector("#vault-search");
  const sortControl = document.querySelector("#sort-treasures");
  const status = document.querySelector("#vault-result-status");
  if (!form || !search || !sortControl) return;
  clearCollectionFilters();
  search.value = "My favorites";
  sortControl.value = "updated-desc";
  form.requestSubmit();
  if (status) status.textContent = "Opening Favorites…";
}

async function favoriteCount() {
  const response = await fetch("/api/vault/favorites", { credentials: "same-origin", headers: { Accept: "application/json" } });
  if (response.status === 401) return null;
  const body = await response.json().catch(() => ({}));
  return response.ok && Number.isInteger(body.count) ? body.count : null;
}

function install() {
  const sidebar = document.querySelector(".vault-sidebar");
  if (!sidebar || sidebar.querySelector("[data-vault-system-views]")) return;

  const section = element("section", "sidebar-section vault-system-views");
  section.dataset.vaultSystemViews = "";
  const head = element("div", "sidebar-section-head");
  head.append(element("h3", "", "Royal Vault views"));
  section.append(
    head,
    element("p", "empty-copy", "Open trustworthy collection views built from your explicit Favorites, real Vault timestamps, and duplicate analysis.")
  );

  const list = element("div", "system-view-list");
  const definitions = [
    ["All treasures", "updated-desc", "all Vault treasures"],
    ["Recently added", "created-desc", "recently added treasures"],
    ["Recently updated", "updated-desc", "recently updated treasures"]
  ];
  for (const [buttonLabel, sort, statusLabel] of definitions) {
    const button = element("button", "system-view-button", buttonLabel);
    button.type = "button";
    button.addEventListener("click", () => applySortedView(sort, statusLabel));
    list.append(button);
  }

  const favorites = element("button", "system-view-button", "Favorites");
  favorites.type = "button";
  const count = element("span", "system-view-count", "");
  count.setAttribute("aria-label", "Favorite treasure count");
  favorites.append(count);
  favorites.addEventListener("click", applyFavoritesView);
  list.append(favorites);

  const duplicates = element("button", "system-view-button", "Possible duplicates");
  duplicates.type = "button";
  duplicates.addEventListener("click", () => document.querySelector("#show-duplicates")?.click());
  list.append(duplicates);
  section.append(list);

  async function refreshFavoriteCount() {
    const value = await favoriteCount();
    count.textContent = value === null ? "" : `(${value.toLocaleString()})`;
  }

  window.addEventListener("kingdom:vault-favorite-change", () => refreshFavoriteCount());
  refreshFavoriteCount();

  const keeper = sidebar.querySelector(".keeper-sidebar-callout");
  if (keeper) sidebar.insertBefore(section, keeper);
  else sidebar.append(section);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
else install();
