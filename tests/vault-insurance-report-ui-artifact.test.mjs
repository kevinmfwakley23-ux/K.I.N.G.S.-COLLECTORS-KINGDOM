import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const uiUrl = new URL("../apps/web/public/vault-report-ui.js", import.meta.url);
const uiCssUrl = new URL("../apps/web/public/vault-report-ui.css", import.meta.url);
const printCssUrl = new URL("../apps/web/public/vault-report.css", import.meta.url);
const runtimeUrl = new URL("../apps/web/runtime.mjs", import.meta.url);
const valuationHttpUrl = new URL("../apps/web/vault-valuation-http.mjs", import.meta.url);

test("Royal Vault exposes collector-controlled JSON and print evidence report actions with explicit limitations", async () => {
  const source = await readFile(uiUrl, "utf8");
  assert.match(source, /Collection Evidence Report/);
  assert.match(source, /Insurance preparation/);
  assert.match(source, /Not an appraisal/);
  assert.match(source, /Download evidence JSON/);
  assert.match(source, /Open print report/);
  assert.match(source, /includeArchived/);
  assert.match(source, /collectionId/);
  assert.match(source, /\/api\/vault\/reports\/insurance-preparation/);
  assert.match(source, /currencies are never silently converted/i);
});

test("report controls and print view include mobile, focus, reduced-motion and print accommodations", async () => {
  const [uiCss, printCss] = await Promise.all([readFile(uiCssUrl, "utf8"), readFile(printCssUrl, "utf8")]);
  assert.match(uiCss, /@media \(max-width: 640px\)/);
  assert.match(uiCss, /prefers-reduced-motion/);
  assert.match(printCss, /@media print/);
  assert.match(printCss, /@page/);
  assert.match(printCss, /focus-visible/);
  assert.match(printCss, /table-scroll/);
});

test("production runtime wires report authority through the existing valuation HTTP boundary", async () => {
  const [runtime, valuationHttp] = await Promise.all([readFile(runtimeUrl, "utf8"), readFile(valuationHttpUrl, "utf8")]);
  assert.match(runtime, /createVaultReportService/);
  assert.match(runtime, /vaultReportService/);
  assert.match(runtime, /reportService: vaultReportService/);
  assert.match(runtime, /collectionEvidenceReporting: true/);
  assert.match(valuationHttp, /handleVaultReportRoute/);
  assert.match(valuationHttp, /vaultValuationService\?\.reportService/);
  assert.match(valuationHttp, /\/api\/vault\/reports\/insurance-preparation/);
});
