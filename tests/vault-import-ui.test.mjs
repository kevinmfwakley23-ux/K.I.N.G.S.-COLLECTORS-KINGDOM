import test from "node:test";
import assert from "node:assert/strict";
import {
  buildImportDecisions,
  defaultCsvMappings,
  detectImportFormat,
  inferVaultImportTarget,
  mapCsvToVaultRecords,
  parseCsv,
  parseJsonRecords
} from "../apps/web/public/vault-import-core.js";

test("Vault CSV parser handles quoted commas, embedded newlines, escaped quotes, and BOM", () => {
  const parsed = parseCsv('\uFEFFTitle,Publisher,Notes\r\n"Amazing, Book",Marvel,"Line one\nLine two"\r\n"Quoted ""Thing""",DC,Test');
  assert.deepEqual(parsed.headers, ["Title", "Publisher", "Notes"]);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0][0], "Amazing, Book");
  assert.equal(parsed.rows[0][2], "Line one\nLine two");
  assert.equal(parsed.rows[1][0], 'Quoted "Thing"');
});

test("Vault CSV mappings infer common collector exports and preserve custom attributes", () => {
  const parsed = parseCsv("Name,Type,Publisher,UPC,Purchase Price,Currency,Grade\nSpawn #1,Comic Book,Image Comics,709853002147,12.50,USD,9.4");
  const mappings = defaultCsvMappings(parsed.headers).map((mapping) => ({ ...mapping }));
  const gradeIndex = parsed.headers.indexOf("Grade");
  mappings[gradeIndex] = { target: "attribute", attributeName: "Grade" };
  const records = mapCsvToVaultRecords(parsed, mappings);

  assert.equal(inferVaultImportTarget("Name"), "title");
  assert.equal(inferVaultImportTarget("UPC"), "barcode");
  assert.deepEqual(records, [{
    title: "Spawn #1",
    category: "Comic Book",
    manufacturer: "Image Comics",
    externalIdentifiers: { upc: "709853002147" },
    purchasePriceCents: 1250,
    currency: "USD",
    attributes: { Grade: "9.4" }
  }]);
});

test("Vault CSV import requires exactly one title mapping", () => {
  const parsed = parseCsv("Thing,Category\nExample,Other");
  assert.throws(
    () => mapCsvToVaultRecords(parsed, [{ target: "ignore" }, { target: "category" }]),
    /exactly one CSV column to Title/i
  );
});

test("Vault import format detection and JSON parsing stay deterministic", () => {
  assert.equal(detectImportFormat({ filename: "collection.csv", text: '[{"title":"A"}]' }), "csv");
  assert.equal(detectImportFormat({ filename: "collection.json", text: "Title,Type" }), "json");
  assert.equal(detectImportFormat({ text: "  [ {\"title\":\"A\"} ]" }), "json");
  assert.equal(detectImportFormat({ text: "Title,Type\nA,Other" }), "csv");
  assert.deepEqual(parseJsonRecords('[{"title":"A"}]'), [{ title: "A" }]);
  assert.throws(() => parseJsonRecords("{}"), /array of treasure records/i);
});

test("Vault import decisions default clean rows to import and require explicit duplicate review", () => {
  const batch = {
    rows: [
      { index: 0, status: "ready" },
      { index: 1, status: "review" },
      { index: 2, status: "rejected" }
    ]
  };
  assert.throws(() => buildImportDecisions(batch, new Map()), /still needs an Import or Skip decision/i);
  assert.deepEqual(buildImportDecisions(batch, new Map([[1, "skip"]])), [
    { index: 0, action: "import" },
    { index: 1, action: "skip" },
    { index: 2, action: "skip" }
  ]);
});
