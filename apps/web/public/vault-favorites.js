function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: { Accept: "application/json", ...(options.headers ?? {}) }
  });
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Favorite status could not be updated.");
  return body;
}

function favoriteQueryActive() {
  const value = String(document.querySelector("#vault-search")?.value ?? "").toLowerCase();
  return /\bfavou?rites?\b/.test(value);
}

export async function createFavoriteControl(treasureId) {
  const section = element("section", "favorite-control");
  section.dataset.treasureId = treasureId;
  const copy = element("div", "favorite-copy");
  copy.append(
    element("p", "eyebrow", "Collector Preference"),
    element("h3", "", "Favorite"),
    element("p", "empty-copy", "Favorites are an explicit private Vault preference, separate from tags, notes, value, and Marketplace status.")
  );
  const button = element("button", "favorite-button", "Loading Favorite status…");
  button.type = "button";
  button.disabled = true;
  button.setAttribute("aria-pressed", "false");
  const status = element("p", "form-status favorite-status", "");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  section.append(copy, button, status);

  let favorite = false;

  function render(state) {
    favorite = Boolean(state.favorite);
    button.disabled = false;
    button.classList.toggle("active", favorite);
    button.setAttribute("aria-pressed", String(favorite));
    button.textContent = favorite ? "★ Remove from Favorites" : "☆ Add to Favorites";
  }

  async function load() {
    const result = await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/favorite`);
    render(result.favorite);
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = favorite ? "Removing from Favorites…" : "Adding to Favorites…";
    try {
      const result = await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/favorite`, {
        method: favorite ? "DELETE" : "PUT"
      });
      render(result.favorite);
      status.textContent = favorite ? "Added to Favorites." : "Removed from Favorites.";
      window.dispatchEvent(new CustomEvent("kingdom:vault-favorite-change", {
        detail: { treasureId, favorite }
      }));
      if (!favorite && favoriteQueryActive()) document.querySelector("#vault-search-form")?.requestSubmit();
    } catch (error) {
      status.textContent = error.message;
      button.disabled = false;
    }
  });

  try {
    await load();
  } catch (error) {
    status.textContent = error.message;
    button.hidden = true;
  }

  return section;
}
