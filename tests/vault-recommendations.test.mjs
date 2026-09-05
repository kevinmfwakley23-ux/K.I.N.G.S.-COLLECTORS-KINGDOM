import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultRecommendationService } from "../packages/vault/src/recommendations.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const owner = Object.freeze({ id: "recommend-owner" });
const other = Object.freeze({ id: "recommend-other" });

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-recommendations-"));
  const filename = join(directory, "vault.sqlite");
  const mediaRoot = join(directory, "media");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot });
  const recommendations = createVaultRecommendationService({ filename });
  return {
    directory,
    store,
    vault,
    recommendations,
    close: async () => {
      recommendations.close();
      store.close();
      await rm(directory, { recursive: true, force: true });
    }
  };
}

test("tag recommendations are grounded in the authenticated collector's similar Vault records", async () => {
  const setup = await fixture();
  try {
    const target = setup.vault.createTreasure(owner, {
      title: "Target Rookie",
      category: "Sports Cards",
      series: "Chrome Championship",
      manufacturer: "Topps",
      year: 2024,
      tags: ["rookie"]
    });
    setup.vault.createTreasure(owner, {
      title: "Peer One",
      category: "Sports Cards",
      series: "Chrome Championship",
      manufacturer: "Topps",
      year: 2024,
      tags: ["refractor", "favorite"]
    });
    setup.vault.createTreasure(owner, {
      title: "Peer Two",
      category: "Sports Cards",
      series: "Chrome Championship",
      manufacturer: "Topps",
      year: 2024,
      tags: ["refractor", "graded"]
    });
    setup.vault.createTreasure(owner, {
      title: "Peer Three",
      category: "Sports Cards",
      series: "Heritage",
      manufacturer: "Topps",
      year: 2023,
      tags: ["graded"]
    });

    for (let index = 0; index < 4; index += 1) {
      setup.vault.createTreasure(other, {
        title: `Private Peer ${index}`,
        category: "Sports Cards",
        series: "Chrome Championship",
        manufacturer: "Topps",
        year: 2024,
        tags: ["other-collector-secret"]
      });
    }

    const result = setup.recommendations.recommendTags(owner, target.id, { limit: 6 });
    assert.equal(result[0].tag, "refractor");
    assert.equal(result[0].basis, "collector-vault-pattern");
    assert.equal(result[0].peerCount, 2);
    assert.equal(result[0].signals.sameSeriesPeers, 2);
    assert.match(result[0].explanation, /your Vault/);
    assert.ok(result.some((item) => item.tag === "graded"));
    assert.ok(!result.some((item) => item.tag === "rookie"));
    assert.ok(!result.some((item) => item.tag === "other-collector-secret"));
    assert.deepEqual(setup.vault.getTreasure(owner, target.id).tags, ["rookie"]);
    assert.equal(setup.recommendations.policy.automaticApplication, false);
    assert.equal(setup.recommendations.policy.crossCollectorLearning, false);
    assert.equal(setup.recommendations.policy.modelGenerated, false);
  } finally {
    await setup.close();
  }
});

test("tag recommendations fail closed across collectors and return honestly empty when no peer pattern exists", async () => {
  const setup = await fixture();
  try {
    const isolated = setup.vault.createTreasure(owner, {
      title: "Only Music Treasure",
      category: "Music Memorabilia",
      tags: ["signed"]
    });
    setup.vault.createTreasure(other, {
      title: "Someone Else's Music Treasure",
      category: "Music Memorabilia",
      tags: ["tour-used"]
    });

    assert.deepEqual(setup.recommendations.recommendTags(owner, isolated.id), []);
    assert.throws(
      () => setup.recommendations.recommendTags(other, isolated.id),
      (error) => error?.code === "treasure_not_found" && error?.statusCode === 404
    );
  } finally {
    await setup.close();
  }
});

test("tag recommendation limits are bounded rather than allowing unbounded Keeper context", async () => {
  const setup = await fixture();
  try {
    const target = setup.vault.createTreasure(owner, { title: "Bounded Target", category: "Comic Books" });
    assert.throws(
      () => setup.recommendations.recommendTags(owner, target.id, { limit: 1000 }),
      (error) => error?.code === "invalid_tag_recommendation_limit"
    );
    assert.equal(setup.recommendations.maximumRecommendations, 12);
  } finally {
    await setup.close();
  }
});
