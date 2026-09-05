import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultOwnershipService } from "../packages/vault/src/ownership.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";
import { listVaultCategoryProfiles, matchVaultCategory } from "../packages/vault/src/taxonomy.mjs";

const collectorA = Object.freeze({ id: "collector-taxonomy-a", displayName: "Collector A" });
const collectorB = Object.freeze({ id: "collector-taxonomy-b", displayName: "Collector B" });

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-taxonomy-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  const ownership = createVaultOwnershipService({ filename });
  try {
    await run({ vault, attributes: ownership.attributeService });
  } finally {
    ownership.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("Vault category intelligence covers the Kingdom's multi-collectible scope without making categories restrictive", () => {
  const profiles = listVaultCategoryProfiles();
  const labels = new Set(profiles.map((profile) => profile.label));
  for (const label of [
    "Sports Cards",
    "Trading Card Games (TCG)",
    "Funko Pops & Vinyl Figures",
    "Hot Wheels & Die-Cast",
    "Comic Books",
    "Action Figures",
    "Stamps & Postal Collectibles",
    "Coins, Currency & Legal Tender",
    "Film & Movie Memorabilia",
    "Sports Memorabilia",
    "Autographed & Signed Items",
    "Music Memorabilia"
  ]) assert.ok(labels.has(label), `Missing category profile: ${label}`);

  assert.equal(matchVaultCategory("Pokemon").id, "tcg-cards");
  assert.equal(matchVaultCategory("baseball cards").id, "sports-cards");
  assert.equal(matchVaultCategory("paper money").id, "coins-currency");
  assert.equal(matchVaultCategory("my one-of-a-kind family collection"), null);
});

test("category profiles carry specialized metadata instead of forcing one card-centric schema", () => {
  const sports = matchVaultCategory("sports cards");
  const coins = matchVaultCategory("coins");
  const autographs = matchVaultCategory("autographs");
  const music = matchVaultCategory("music memorabilia");

  assert.ok(sports.fields.some((field) => field.key === "player"));
  assert.ok(sports.fields.some((field) => field.key === "parallel" || field.key === "variant"));
  assert.ok(coins.fields.some((field) => field.key === "mint_mark"));
  assert.ok(coins.fields.some((field) => field.key === "certification_number"));
  assert.ok(autographs.fields.some((field) => field.key === "authenticator"));
  assert.ok(music.fields.some((field) => field.key === "tour"));
});

test("collectible detail attributes persist per treasure and remain collector scoped", async () => {
  await withVault(async ({ vault, attributes }) => {
    const treasure = vault.createTreasure(collectorA, { title: "Signed Rookie Jersey", category: "Sports Memorabilia" });
    const first = attributes.upsert(collectorA, treasure.id, {
      key: "athlete",
      label: "Athlete",
      value: "Example Player"
    });
    assert.equal(first.value, "Example Player");
    assert.equal(first.sourceType, "collector-entered");
    assert.equal(first.verificationStatus, "not-checked");

    const cert = attributes.upsert(collectorA, treasure.id, {
      key: "certification_number",
      label: "Certification Number",
      value: "ABC-12345",
      verificationProvider: "Example Authenticator",
      verificationReference: "collector-entered reference",
      verificationStatus: "externally-verified"
    });
    assert.equal(cert.verificationStatus, "not-checked", "collector input must not self-promote external verification");
    assert.equal(attributes.list(collectorA, treasure.id).length, 2);

    assert.throws(
      () => attributes.list(collectorB, treasure.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );
  });
});

test("collectible details reject forged source types and complex executable-shaped values", async () => {
  await withVault(async ({ vault, attributes }) => {
    const treasure = vault.createTreasure(collectorA, { title: "Gold Coin", category: "Coins" });
    assert.throws(
      () => attributes.upsert(collectorA, treasure.id, { key: "grade", label: "Grade", value: "MS65", sourceType: "externally-verified" }),
      (error) => error instanceof VaultError && error.code === "invalid_attribute_source"
    );
    assert.throws(
      () => attributes.upsert(collectorA, treasure.id, { key: "unsafe", label: "Unsafe", value: { run: "code" } }),
      (error) => error instanceof VaultError && error.code === "invalid_attribute_value"
    );
  });
});
