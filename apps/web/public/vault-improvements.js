function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

async function api(path) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok) throw new Error(body.message ?? "Collection stewardship guidance is unavailable.");
  return body;
}

function priorityLabel(priority) {
  if (priority === "high") return "High priority";
  if (priority === "medium") return "Worth improving";
  return "Optional next step";
}

function recommendationCard(item) {
  const card = element("article", "vault-improvement-card");
  const heading = element("div", "vault-improvement-heading");
  heading.append(
    element("span", `vault-improvement-priority priority-${item.priority ?? "low"}`, priorityLabel(item.priority)),
    element("strong", "", item.title)
  );
  card.append(heading);

  const affected = Number(item.affectedCount ?? 0);
  card.append(element("p", "vault-improvement-count", `${affected.toLocaleString()} affected ${affected === 1 ? "record" : "records"}`));
  if (item.reason) card.append(element("p", "vault-improvement-reason", item.reason));

  if (Array.isArray(item.examples) && item.examples.length) {
    const examples = element("ul", "vault-improvement-examples");
    for (const example of item.examples.slice(0, 3)) {
      examples.append(element("li", "", example.title));
    }
    card.append(examples);
  }

  if (item.action) {
    const action = element("p", "vault-improvement-action");
    action.append(element("strong", "", "Suggested next step: "), document.createTextNode(item.action));
    card.append(action);
  }
  return card;
}

function installPanel() {
  const sidebar = document.querySelector(".vault-sidebar");
  if (!sidebar || sidebar.querySelector("[data-vault-improvements]")) return;

  const section = element("section", "sidebar-section vault-improvements-panel");
  section.dataset.vaultImprovements = "true";
  section.setAttribute("aria-labelledby", "vault-improvements-title");

  const head = element("div", "sidebar-section-head");
  const title = element("h3", "", "Collection stewardship");
  title.id = "vault-improvements-title";
  const refresh = element("button", "icon-text-button", "Refresh");
  refresh.type = "button";
  head.append(title, refresh);

  const intro = element("p", "empty-copy", "Grounded suggestions from your own Vault state. Nothing is changed automatically.");
  const status = element("p", "form-status", "Reviewing collection records…");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const list = element("div", "vault-improvements-list");

  section.append(head, intro, status, list);
  const keeperCallout = sidebar.querySelector(".keeper-sidebar-callout");
  if (keeperCallout) sidebar.insertBefore(section, keeperCallout);
  else sidebar.append(section);

  let loading = false;
  async function load() {
    if (loading) return;
    loading = true;
    refresh.disabled = true;
    status.textContent = "Reviewing collection records…";
    try {
      const result = await api("/api/vault/improvements?limit=6");
      list.replaceChildren();
      const items = Array.isArray(result.improvements) ? result.improvements : [];
      if (!items.length) {
        list.append(element("p", "empty-copy", "No improvement opportunities were identified by the current Vault checks. Continue preserving the details that matter to you."));
      } else {
        for (const item of items) list.append(recommendationCard(item));
      }
      status.textContent = result.policy?.automaticApplication === false
        ? "Advisory only — you remain in control of every change."
        : "Collection stewardship guidance loaded.";
    } catch (error) {
      list.replaceChildren();
      status.textContent = error.message;
    } finally {
      loading = false;
      refresh.disabled = false;
    }
  }

  refresh.addEventListener("click", load);
  document.addEventListener("vault:improvements-refresh", load);
  load();
}

installPanel();
