import test from "node:test";
import assert from "node:assert/strict";
import { buildPagedVaultQuery, loadedResultLabel, mergeTreasurePage } from "../apps/web/public/vault-pagination-core.js";
import { filterStateFromControls, nextViewName, savedViewSummary } from "../apps/web/public/vault-saved-views-core.js";

test("Vault browser pagination builds bounded query state without the legacy 500-record limit", () => {
  const query = buildPagedVaultQuery({
    query: "Jordan rookie",
    category: "Cards",
    collectionId: "collection-1",
    locationId: "safe-1",
    year: 1986,
    tag: "rookie",
    sort: "title",
    order: "asc"
  }, { pageSize: 50, cursor: "cursor-1" });
  const params = new URLSearchParams(query);
  assert.equal(params.get("q"), "Jordan rookie");
  assert.equal(params.get("category"), "Cards");
  assert.equal(params.get("year"), "1986");
  assert.equal(params.get("tag"), "rookie");
  assert.equal(params.get("pageSize"), "50");
  assert.equal(params.get("cursor"), "cursor-1");
  assert.equal(params.has("limit"), false);
});

test("paged browser merging preserves first-seen permanent IDs and labels partial result state honestly", () => {
  const merged = mergeTreasurePage(
    [{ id: "a", title: "A" }, { id: "b", title: "B" }],
    [{ id: "b", title: "B duplicate" }, { id: "c", title: "C" }],
    { append: true }
  );
  assert.deepEqual(merged.map((item) => item.id), ["a", "b", "c"]);
  assert.equal(merged[1].title, "B");
  assert.equal(loadedResultLabel(50, true), "50 loaded results • more available");
  assert.equal(loadedResultLabel(1, false), "1 loaded result");
});

test("saved view browser state stores filters and sort intent rather than rendered results", () => {
  const filters = filterStateFromControls({
    search: "  signed  ",
    category: "Comics",
    collectionId: "collection-1",
    locationId: "cabinet-2",
    year: "1994",
    tag: "Key Issue",
    sort: "category"
  });
  assert.deepEqual(filters, {
    query: "signed",
    category: "Comics",
    collectionId: "collection-1",
    locationId: "cabinet-2",
    condition: null,
    year: 1994,
    tag: "Key Issue",
    sort: "category",
    order: "asc",
    includeArchived: false
  });
  assert.equal(Object.prototype.hasOwnProperty.call(filters, "treasures"), false);
});

test("saved view summaries and duplicate-name suggestions remain deterministic", () => {
  const summary = savedViewSummary({
    filters: {
      category: "Cards",
      collectionId: "collection-1",
      locationId: "safe-1",
      year: 1986,
      tag: "Rookie",
      sort: "updatedAt",
      order: "desc"
    }
  }, {
    collectionNames: new Map([["collection-1", "Rookies"]]),
    locationNames: new Map([["safe-1", "Office → Safe"]])
  });
  assert.match(summary, /Category: Cards/);
  assert.match(summary, /Collection: Rookies/);
  assert.match(summary, /Location: Office → Safe/);
  assert.match(summary, /Year: 1986/);
  assert.match(summary, /Tag: Rookie/);
  assert.equal(nextViewName("Favorites", ["favorites", "Favorites 2"]), "Favorites 3");
});
