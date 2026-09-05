import test from "node:test";
import assert from "node:assert/strict";
import { createGreatHallService } from "../packages/great-hall/src/service.mjs";
import { createVaultIntelligence } from "../packages/vault/src/intelligence.mjs";

const collector = Object.freeze({
  id: "collector-set-curator",
  displayName: "Set Curator Collector",
  roles: ["collector"],
  emailVerified: true
});

function stats() {
  return {
    treasureCount: 0,
    unitCount: 0,
    usdEstimatedValueCents: 0,
    categoryCount: 0,
    duplicateGroups: 0,
    categories: []
  };
}

function baseVault() {
  return {
    stats,
    keeperContext(identity) {
      assert.equal(identity.id, collector.id);
      return { summary: stats(), recentTreasures: [] };
    },
    getTreasure() {
      throw new Error("No treasure detail should be requested in this test.");
    }
  };
}

function rawSet(index) {
  return {
    id: `private-set-id-${index}`,
    name: `Incomplete Set ${index}`,
    category: index % 2 ? "Sports Cards" : "Comic Books",
    series: `Series ${index}`,
    completionPercent: index * 10,
    completeEntryCount: index,
    expectedEntryCount: index + 4,
    missingEntryCount: 4,
    expectedUnitCount: index + 8,
    creditedOwnedUnitCount: index,
    missingUnitCount: 8,
    sourceType: "catalog-import",
    sourceLabel: "Private Catalog Source",
    sourceReference: `https://private.example/set-${index}`,
    notes: `Private collector note ${index}`,
    entries: [{ id: `entry-${index}`, label: "Secret checklist entry" }]
  };
}

test("Royal Curator receives at most six sanitized incomplete-set summaries", () => {
  let receivedIdentity = null;
  let receivedOptions = null;
  const setSummaryService = {
    list(identity, options) {
      receivedIdentity = identity;
      receivedOptions = options;
      return Array.from({ length: 9 }, (_, index) => rawSet(index + 1));
    }
  };
  const intelligence = createVaultIntelligence({
    vaultService: baseVault(),
    setSummaryService
  });

  const context = intelligence.keeperContext(collector, "What collection sets am I missing?");
  assert.equal(receivedIdentity.id, collector.id);
  assert.deepEqual(receivedOptions, { incompleteOnly: true, limit: 6 });
  assert.equal(context.incompleteSets.length, 6);
  assert.deepEqual(Object.keys(context.incompleteSets[0]).sort(), [
    "category",
    "completeEntryCount",
    "completionPercent",
    "expectedEntryCount",
    "missingEntryCount",
    "missingUnitCount",
    "name",
    "series"
  ].sort());
  assert.equal(context.incompleteSets[0].name, "Incomplete Set 1");
  assert.equal(context.incompleteSets[0].missingEntryCount, 4);
  assert.equal(context.contextPolicy.maximumIncompleteSets, 6);
  assert.equal(context.contextPolicy.setEntryGraphsIncluded, false);
  assert.equal(context.contextPolicy.setSourceReferencesIncluded, false);

  const serialized = JSON.stringify(context);
  assert.doesNotMatch(serialized, /private-set-id/);
  assert.doesNotMatch(serialized, /Private Catalog Source/);
  assert.doesNotMatch(serialized, /private\.example/);
  assert.doesNotMatch(serialized, /Private collector note/);
  assert.doesNotMatch(serialized, /Secret checklist entry/);
});

test("Great Hall Keeper context exposes bounded set progress only while serving as Royal Curator in the Vault", () => {
  let listCalls = 0;
  const intelligence = createVaultIntelligence({
    vaultService: baseVault(),
    setSummaryService: {
      list() {
        listCalls += 1;
        return [rawSet(1)];
      }
    }
  });
  const hall = createGreatHallService({
    identityService: { listRecentActivity() { return []; } },
    vaultService: intelligence
  });

  const vaultRequest = hall.keeperRouteRequest(collector, {
    roomId: "vault",
    message: "What sets am I still missing?"
  });
  assert.equal(listCalls, 1);
  const vaultSystem = vaultRequest.messages[0].content;
  assert.match(vaultSystem, /Incomplete Set 1/);
  assert.match(vaultSystem, /missingEntryCount/);
  assert.doesNotMatch(vaultSystem, /Private collector note/);
  assert.doesNotMatch(vaultSystem, /private\.example/);

  const hallRequest = hall.keeperRouteRequest(collector, {
    roomId: "great-hall",
    message: "What rooms are available?"
  });
  assert.equal(listCalls, 1);
  assert.doesNotMatch(hallRequest.messages[0].content, /Authorized Royal Vault context/);
  assert.doesNotMatch(hallRequest.messages[0].content, /Incomplete Set 1/);
});
