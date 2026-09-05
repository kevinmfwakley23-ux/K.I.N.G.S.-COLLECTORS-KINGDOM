import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

async function source(relative) {
  return readFile(resolve(root, relative), "utf8");
}

test("Vault browser entry points reach category guidance, collectible details, Curator guidance, provenance, evidence, import UI, saved views, collection sets, and Marketplace preparation", async () => {
  const [html, vault, provenance, categories, details, recommendations, improvements, evidence, savedViews, sets, marketplace, styles] = await Promise.all([
    source("apps/web/public/vault.html"),
    source("apps/web/public/vault.js"),
    source("apps/web/public/vault-provenance.js"),
    source("apps/web/public/vault-categories.js"),
    source("apps/web/public/vault-details.js"),
    source("apps/web/public/vault-tag-recommendations.js"),
    source("apps/web/public/vault-improvements.js"),
    source("apps/web/public/vault-evidence.js"),
    source("apps/web/public/vault-saved-views.js"),
    source("apps/web/public/vault-sets.js"),
    source("apps/web/public/vault-marketplace-readiness.js"),
    source("apps/web/public/vault-ui-styles.js")
  ]);

  assert.match(html, /src="\/vault\.js"/);
  assert.match(html, /src="\/vault-import\.js"/);
  assert.match(vault, /from "\.\/vault-provenance\.js"/);
  assert.match(provenance, /from "\.\/vault-details\.js"/);
  assert.match(provenance, /from "\.\/vault-tag-recommendations\.js"/);
  assert.match(provenance, /from "\.\/vault-evidence\.js"/);
  assert.match(provenance, /from "\.\/vault-marketplace-readiness\.js"/);
  assert.match(provenance, /import "\.\/vault-categories\.js"/);
  assert.match(categories, /import "\.\/vault-saved-views\.js"/);
  assert.match(categories, /import "\.\/vault-sets\.js"/);
  assert.match(categories, /import "\.\/vault-improvements\.js"/);
  assert.match(categories, /import "\.\/vault-ui-styles\.js"/);
  assert.match(details, /\/api\/vault\/categories/);
  assert.match(details, /\/attributes/);
  assert.match(recommendations, /\/tag-recommendations\?limit=6/);
  assert.match(recommendations, /Suggestions come only from patterns in your own Vault/);
  assert.match(recommendations, /never applies a tag automatically/);
  assert.match(improvements, /\/api\/vault\/improvements\?limit=6/);
  assert.match(improvements, /Grounded suggestions from your own Vault state/);
  assert.match(improvements, /Nothing is changed automatically/);
  assert.match(evidence, /\/evidence/);
  assert.match(evidence, /Not independently checked/);
  assert.match(savedViews, /\/api\/vault\/saved-views/);
  assert.match(sets, /\/api\/vault\/sets/);
  assert.match(sets, /\/api\/vault\/treasures\?/);
  assert.match(sets, /You decide which treasure belongs in this set entry/);
  assert.match(marketplace, /\/api\/vault\/marketplace-ready/);
  assert.match(marketplace, /\/marketplace-preparation/);
  assert.match(marketplace, /does not publish, price, ship, or list/);
  assert.match(styles, /\/vault-import\.css/);
  assert.match(styles, /\/vault-details\.css/);
  assert.match(styles, /\/vault-saved-views\.css/);
  assert.match(styles, /\/vault-evidence\.css/);
  assert.match(styles, /\/vault-sets\.css/);
  assert.match(styles, /\/vault-marketplace-readiness\.css/);
  assert.match(styles, /\/vault-tag-recommendations\.css/);
  assert.match(styles, /\/vault-improvements\.css/);
});

test("Vault production UI does not leave enrichment, Curator guidance, evidence, saved-view, set, or Marketplace readiness intelligence as unreachable packaged assets", async () => {
  const [provenance, categories, recommendations, improvements, styles] = await Promise.all([
    source("apps/web/public/vault-provenance.js"),
    source("apps/web/public/vault-categories.js"),
    source("apps/web/public/vault-tag-recommendations.js"),
    source("apps/web/public/vault-improvements.js"),
    source("apps/web/public/vault-ui-styles.js")
  ]);
  assert.ok(provenance.includes("./vault-categories.js"));
  assert.ok(provenance.includes("createCollectibleDetailsSection"));
  assert.ok(provenance.includes("createTagRecommendationSection"));
  assert.ok(provenance.includes("createEvidenceSection"));
  assert.ok(provenance.includes("createMarketplacePreparationSection"));
  assert.ok(categories.includes("./vault-saved-views.js"));
  assert.ok(categories.includes("./vault-sets.js"));
  assert.ok(categories.includes("./vault-improvements.js"));
  assert.ok(categories.includes("./vault-ui-styles.js"));
  assert.ok(recommendations.includes("/tag-recommendations?limit=6"));
  assert.ok(improvements.includes("/api/vault/improvements?limit=6"));
  assert.ok(improvements.includes("vault:improvements-refresh"));
  assert.ok(styles.includes("/vault-evidence.css"));
  assert.ok(styles.includes("/vault-sets.css"));
  assert.ok(styles.includes("/vault-marketplace-readiness.css"));
  assert.ok(styles.includes("/vault-tag-recommendations.css"));
  assert.ok(styles.includes("/vault-improvements.css"));
});
