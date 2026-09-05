import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultEvidenceService } from "../packages/vault/src/evidence.mjs";
import { createVaultOwnershipService } from "../packages/vault/src/ownership.mjs";
import { createVaultSearchService } from "../packages/vault/src/search.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collector = Object.freeze({ id: "search-owner", displayName: "Search Owner" });
const otherCollector = Object.freeze({ id: "search-other", displayName: "Other Collector" });
const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n", "utf8");

async function withSearch(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-search-"));
  const filename = join(directory, "vault.sqlite");
  const storageRoot = join(directory, "media");
  const store = new SqliteVaultStore(filename);
  const ownership = createVaultOwnershipService({ filename });
  const search = createVaultSearchService({ filename });
  const vault = createVaultService({ store, mediaRoot: storageRoot });
  const evidence = createVaultEvidenceService({ filename, storageRoot, vaultService: vault });
  try {
    await run({ vault, ownership, search, evidence });
  } finally {
    evidence.close();
    search.close();
    ownership.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("extended Vault search combines core fields and collectible-specific details", async () => {
  await withSearch(async ({ vault, ownership, search }) => {
    const location = vault.createLocation(collector, { name: "Card Safe", kind: "safe" });
    const treasure = vault.createTreasure(collector, {
      title: "1986 Fleer Michael Jordan #57",
      category: "Sports Cards",
      series: "1986 Fleer",
      manufacturer: "Fleer",
      year: 1986,
      condition: "Graded",
      locationId: location.id,
      tags: ["rookie", "basketball"]
    });
    ownership.attributeService.upsert(collector, treasure.id, { key: "team", label: "Team", value: "Chicago Bulls" });
    ownership.attributeService.upsert(collector, treasure.id, { key: "grading_company", label: "Grading company", value: "PSA", verificationProvider: "PSA" });
    ownership.attributeService.upsert(collector, treasure.id, { key: "grade", label: "Grade", value: "9" });

    const result = search.search(collector, "show me my Jordan Bulls PSA 9", { limit: 20 });
    assert.deepEqual(result.ids, [treasure.id]);
    assert.deepEqual(result.queryTokens, ["jordan", "bulls", "psa", "9"]);
    assert.equal(result.searchApplied, true);

    assert.deepEqual(search.search(otherCollector, "Jordan Bulls PSA 9", { limit: 20 }).ids, []);
  });
});

test("extended search follows provenance, physical location, and later edits", async () => {
  await withSearch(async ({ vault, ownership, search }) => {
    const room = vault.createLocation(collector, { name: "Collection Room", kind: "room" });
    const cabinet = vault.createLocation(collector, { name: "Autograph Cabinet", kind: "cabinet", parentId: room.id });
    const treasure = vault.createTreasure(collector, {
      title: "Signed Concert Poster",
      category: "Music Memorabilia",
      locationId: cabinet.id,
      tags: ["signed", "concert"]
    });
    ownership.add(collector, treasure.id, {
      eventType: "acquired",
      occurredOn: "1995-06-10",
      counterparty: "Dad",
      notes: "Given after the summer concert."
    });
    ownership.attributeService.upsert(collector, treasure.id, { key: "artist", label: "Artist / band", value: "Metallica" });

    assert.deepEqual(search.searchTreasureIds(collector, "Metallica Dad 1995", { limit: 8 }), [treasure.id]);
    assert.deepEqual(search.searchTreasureIds(collector, "Autograph Cabinet", { limit: 8 }), [treasure.id]);

    ownership.attributeService.upsert(collector, treasure.id, { key: "artist", label: "Artist / band", value: "Pearl Jam" });
    assert.deepEqual(search.searchTreasureIds(collector, "Pearl Jam", { limit: 8 }), [treasure.id]);
    assert.deepEqual(search.searchTreasureIds(collector, "Metallica", { limit: 8 }), []);
  });
});

test("extended search indexes evidence metadata but not raw document bytes and refreshes after edits or removal", async () => {
  await withSearch(async ({ vault, search, evidence }) => {
    const treasure = vault.createTreasure(collector, {
      title: "Signed Rookie Jersey",
      category: "Sports Memorabilia"
    });

    assert.deepEqual(search.searchTreasureIds(collector, "JSA authentication", { limit: 8 }), []);

    const document = await evidence.upload(collector, treasure.id, {
      kind: "authentication",
      title: "JSA Letter of Authenticity",
      sourceLabel: "JSA",
      documentDate: "2024-03-02",
      notes: "Auction lot 4812 provenance packet.",
      originalName: "jsa-loa.pdf",
      contentType: "application/pdf",
      bytes: PDF
    });

    assert.deepEqual(search.searchTreasureIds(collector, "JSA authentication", { limit: 8 }), [treasure.id]);
    assert.deepEqual(search.searchTreasureIds(collector, "auction 4812 provenance", { limit: 8 }), [treasure.id]);
    assert.deepEqual(search.searchTreasureIds(otherCollector, "JSA authentication", { limit: 8 }), []);
    assert.deepEqual(search.searchTreasureIds(collector, "Catalog", { limit: 8 }), []);

    evidence.update(collector, document.id, {
      kind: "appraisal",
      title: "Insurance appraisal",
      sourceLabel: "Royal Insurance Services",
      notes: "Replacement-value appraisal supplied by collector."
    });
    assert.deepEqual(search.searchTreasureIds(collector, "Royal Insurance appraisal", { limit: 8 }), [treasure.id]);
    assert.deepEqual(search.searchTreasureIds(collector, "JSA authentication", { limit: 8 }), []);

    await evidence.remove(collector, document.id);
    assert.deepEqual(search.searchTreasureIds(collector, "Royal Insurance appraisal", { limit: 8 }), []);
  });
});

test("extended search preserves normal Vault filters and sort order", async () => {
  await withSearch(async ({ vault, ownership, search }) => {
    const card = vault.createTreasure(collector, { title: "Charizard", category: "TCG Cards", year: 1999, tags: ["favorite"] });
    const comic = vault.createTreasure(collector, { title: "Amazing Fantasy 15", category: "Comics", year: 1962, tags: ["favorite"] });
    ownership.attributeService.upsert(collector, card.id, { key: "character", label: "Character", value: "Spider-Man crossover" });
    ownership.attributeService.upsert(collector, comic.id, { key: "character", label: "Character", value: "Spider-Man" });

    const comicsOnly = search.search(collector, "Spider-Man", { category: "Comics", tag: "favorite", sort: "year-desc", limit: 20 });
    assert.deepEqual(comicsOnly.ids, [comic.id]);
  });
});
