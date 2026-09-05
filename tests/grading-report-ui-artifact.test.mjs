import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const uiUrl = new URL("../apps/web/public/vault-grading-report-ui.js", import.meta.url);
const extrasUrl = new URL("../apps/web/public/vault-extras.js", import.meta.url);
const cssUrl = new URL("../apps/web/public/vault-grading.css", import.meta.url);

test("explainable grading report UI exposes eight advisory dimensions and append-only finding review", async () => {
  const source = await readFile(uiUrl, "utf8");
  assert.match(source, /Explainable grading report/);
  assert.match(source, /front.*back|\["front", "back"\]/s);
  assert.match(source, /centering.*corners.*edges.*surface/s);
  assert.match(source, /pregrade-report/);
  assert.match(source, /finding-reviews/);
  assert.match(source, /Accept evidence/);
  assert.match(source, /Not supported/);
  assert.match(source, /Unsure/);
  assert.match(source, /Raw detector evidence was preserved|raw detector candidate remains in immutable evidence history/i);
  assert.match(source, /Overall raw-evidence advisory range/);
  assert.match(source, /reviews affect the eight dimension interpretations/i);
  assert.match(source, /do not rewrite or recalculate the overall raw-evidence range/i);
  assert.match(source, /Append-only collector review history/);
  assert.match(source, /earlier decisions and the original detector evidence are never overwritten or deleted/i);
  assert.match(source, /reviewHistory/);
  assert.match(source, /Not an official grade/i);
  assert.match(source, /official subgrade: no/i);
  assert.doesNotMatch(source, /officialGrade\s*:\s*true|officialSubgrade\s*:\s*true|physicalAuthentication\s*:\s*true|mutatesTreasure\s*:\s*true/);
});

test("explainable grading report loads after persistence UI and has responsive dimension/review styles", async () => {
  const extras = await readFile(extrasUrl, "utf8");
  const persistenceIndex = extras.indexOf("./vault-grading-persistence-ui.js");
  const reportIndex = extras.indexOf("./vault-grading-report-ui.js");
  assert.ok(persistenceIndex >= 0);
  assert.ok(reportIndex > persistenceIndex);

  const css = await readFile(cssUrl, "utf8");
  assert.match(css, /grading-dimension-grid/);
  assert.match(css, /grading-finding-review-card/);
  assert.match(css, /grading-finding-review-actions/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /grading-dimension-grid[^}]*grid-template-columns: 1fr/s);
});
