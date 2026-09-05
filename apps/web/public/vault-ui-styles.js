const ENRICHMENT_STYLES = Object.freeze([
  "/vault-import.css",
  "/vault-details.css",
  "/vault-saved-views.css",
  "/vault-evidence.css",
  "/vault-view-modes.css",
  "/vault-system-views.css"
]);

for (const href of ENRICHMENT_STYLES) {
  if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) continue;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.append(link);
}

export { ENRICHMENT_STYLES };
