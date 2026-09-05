import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

async function source(relative) {
  return readFile(resolve(root, relative), "utf8");
}

function luminance(hex) {
  const parts = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = parts.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("Vault document exposes language, responsive viewport, skip navigation, live status, and accessible search semantics", async () => {
  const html = await source("apps/web/public/vault.html");
  assert.match(html, /<html\s+lang="en"/);
  assert.match(html, /<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1"/);
  assert.match(html, /class="skip-link"\s+href="#vault-main"/);
  assert.match(html, /<main\s+id="vault-main"/);
  assert.match(html, /<form\s+id="vault-search-form"[^>]*role="search"/);
  assert.match(html, /id="vault-result-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /id="treasure-form-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /id="detail-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /id="treasure-image-input"[^>]*accept="image\/jpeg,image\/png,image\/webp,image\/heic,image\/heif"/);
});

test("Vault accessibility enrichment gives every native dialog an explicit accessible name and exposes loading state", async () => {
  const [html, accessibility, categories] = await Promise.all([
    source("apps/web/public/vault.html"),
    source("apps/web/public/vault-accessibility.js"),
    source("apps/web/public/vault-categories.js")
  ]);

  for (const dialogId of ["treasure-dialog", "detail-dialog", "folder-dialog", "location-dialog", "duplicates-dialog"]) {
    assert.match(html, new RegExp(`<dialog\\s+id="${dialogId}"`));
    assert.match(accessibility, new RegExp(`\\["${dialogId}"`));
  }
  assert.match(accessibility, /setAttribute\("aria-labelledby", heading\.id\)/);
  assert.match(accessibility, /setAttribute\("aria-busy", loading\.hidden \? "false" : "true"\)/);
  assert.match(accessibility, /MutationObserver/);
  assert.match(accessibility, /#treasure-image-input/);
  assert.match(accessibility, /aria-describedby/);
  assert.match(categories, /import "\.\/vault-accessibility\.js"/);
});

test("treasure cards remain keyboard operable and item photographs expose meaningful text alternatives", async () => {
  const vault = await source("apps/web/public/vault.js");
  assert.match(vault, /card\.tabIndex = 0/);
  assert.match(vault, /card\.setAttribute\("role", "button"\)/);
  assert.match(vault, /card\.setAttribute\("aria-label", `Open \$\{treasure\.title\}`\)/);
  assert.match(vault, /event\.key === "Enter" \|\| event\.key === " "/);
  assert.match(vault, /image\.alt = `Photo of \$\{treasure\.title\}`/);
});

test("Vault styles preserve visible keyboard focus, reduced motion, forced colors, and responsive layouts", async () => {
  const [globalStyles, vaultStyles, accessibilityStyles, styleLoader] = await Promise.all([
    source("apps/web/public/styles.css"),
    source("apps/web/public/vault.css"),
    source("apps/web/public/vault-accessibility.css"),
    source("apps/web/public/vault-ui-styles.js")
  ]);
  assert.match(globalStyles, /input:focus-visible[^\n]*outline: 3px solid var\(--ink\)/);
  assert.match(globalStyles, /\.skip-link:focus\s*\{\s*top: 1rem/);
  assert.match(accessibilityStyles, /\.file-button:focus-within/);
  assert.match(accessibilityStyles, /\.treasure-card:focus-visible/);
  assert.match(accessibilityStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(accessibilityStyles, /@media \(forced-colors: active\)/);
  assert.match(vaultStyles, /@media \(max-width:/);
  assert.match(styleLoader, /\/vault-accessibility\.css/);
});

test("critical Vault text tokens meet WCAG AA contrast against the light marble surface", async () => {
  const globalStyles = await source("apps/web/public/styles.css");
  const token = (name) => globalStyles.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  const ink = token("ink");
  const inkSoft = token("ink-soft");
  const goldDeep = token("gold-deep");
  assert.ok(ink && inkSoft && goldDeep, "critical color tokens must remain explicit six-digit colors");
  for (const [name, value] of [["ink", ink], ["ink-soft", inkSoft], ["gold-deep", goldDeep]]) {
    assert.ok(contrast(value, "#ffffff") >= 4.5, `${name} must retain at least 4.5:1 contrast on white marble`);
  }
});
