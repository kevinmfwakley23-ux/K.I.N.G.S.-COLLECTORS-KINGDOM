import "./pwa.js";

const OFFICIAL_LOGO = "/assets/kingdom-official-logo.svg";

function ensureLink({ rel, href, type, id }) {
  if (id && document.getElementById(id)) return;
  if (document.head.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (type) link.type = type;
  if (id) link.id = id;
  document.head.append(link);
}

function ensureThemeColor() {
  if (document.head.querySelector('meta[name="theme-color"]')) return;
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = "#b18a30";
  document.head.append(meta);
}

function ensureInstallButton() {
  const actions = document.querySelector(".topbar-actions");
  if (!actions || actions.querySelector("[data-install-kingdom]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "quiet-button install-kingdom-button";
  button.dataset.installKingdom = "";
  button.hidden = true;
  button.textContent = "Install app";
  button.setAttribute("aria-label", "Install K.I.N.G.S. Collector's Kingdom");
  actions.prepend(button);
}

ensureLink({ rel: "stylesheet", href: "/brand.css", id: "kingdom-brand-styles" });
ensureLink({ rel: "manifest", href: "/manifest.json", id: "kingdom-manifest" });
ensureLink({ rel: "icon", href: OFFICIAL_LOGO, type: "image/svg+xml", id: "kingdom-favicon" });
ensureThemeColor();
ensureInstallButton();

document.documentElement.dataset.kingdomBrand = "official";
