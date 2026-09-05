import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultDuplicateSummaryService } from "../packages/vault/src/duplicate-summaries.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const owner = Object.freeze({ id: "duplicate-summary-owner" });
const other = Object.freeze({ id: "duplicate-summary-other" });

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-duplicate-summaries-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  const summaries = createVaultDuplicateSummaryService({ filename });
  return {
    directory,
    store,
    vault,
    summaries,
    close: async () => {
      summaries.close();
      store.close();
      await rm(directory, { recursive: true, force: true });
    }
  };
}

function duplicateInput(group, copy, overrides = {}) {
  return {
    title: `Duplicate Item ${group}`,
    category: "Sports Cards",
    series: `Series ${group}`,
    manufacturer: "Example Maker",
    year: 2020 + group,
    condition: copy === 0 ? "Near Mint" : "Excellent",
    notes: `private note ${group}-${copy}`,
    tags: [`private-tag-${group}-${copy}`],
    ...overrides
  };
}

test("duplicate summaries are bounded, owner scoped, sanitized, and never imply automatic merge", async () => {
  const setup = await fixture();
  try {
    for (let group = 0; group < 7; group += 1) {
      for (let copy = 0; copy < 3; copy += 1) setup.vault.createTreasure(owner, duplicateInput(group, copy));
    }
    for (let copy = 0; copy < 4; copy += 1) {
      setup.vault.createTreasure(other, duplicateInput(99, copy, { title: "Other Collector Secret" }));
    }

    const groups = setup.summaries.list(owner, { limit: 5, treasuresPerGroup: 2 });
    assert.equal(groups.length, 5);
    assert.ok(groups.every((group) => group.count === 3));
    assert.ok(groups.every((group) => group.treasures.length === 2));
    assert.ok(groups.every((group) => group.truncated === true));
    assert.ok(groups.every((group) => group.explanation.includes("remain separate Vault records")));
    assert.ok(groups.every((group) => !Object.hasOwn(group, "duplicateKey")));

    const serialized = JSON.stringify(groups);
    assert.doesNotMatch(serialized, /private note/i);
    assert.doesNotMatch(serialized, /private-tag/i);
    assert.doesNotMatch(serialized, /Other Collector Secret/);
    assert.match(serialized, /normalized title, category, series, publisher\/manufacturer, and year/i);
    assert.equal(setup.summaries.policy.automaticMerge, false);
    assert.equal(setup.summaries.policy.automaticDelete, false);
    assert.equal(setup.summaries.policy.collectorDecisionRequired, true);
  } finally {
    await setup.close();
  }
});

test("duplicate summary limits fail closed rather than creating unbounded Keeper context", async () => {
  const setup = await fixture();
  try {
    setup.vault.createTreasure(owner, duplicateInput(1, 0));
    setup.vault.createTreasure(owner, duplicateInput(1, 1));
    assert.throws(
      () => setup.summaries.list(owner, { limit: 1000 }),
      (error) => error?.code === "invalid_duplicate_group_limit"
    );
    assert.throws(
      () => setup.summaries.list(owner, { treasuresPerGroup: 1000 }),
      (error) => error?.code === "invalid_duplicate_group_treasure_limit"
    );
  } finally {
    await setup.close();
  }
});
