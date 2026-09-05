import test from "node:test";
import assert from "node:assert/strict";
import { createGreatHallService } from "../packages/great-hall/src/service.mjs";
import { createVaultIntelligence } from "../packages/vault/src/intelligence.mjs";

const collector = Object.freeze({
  id: "collector-improvement-curator",
  displayName: "Steward Collector",
  roles: ["collector"],
  emailVerified: true
});

const identityService = Object.freeze({
  listRecentActivity() { return []; }
});

function stats() {
  return {
    treasureCount: 2,
    unitCount: 2,
    usdEstimatedValueCents: 0,
    categoryCount: 1,
    duplicateGroups: 0,
    categories: [{ category: "Comic Books", count: 2, units: 2 }]
  };
}

test("Royal Curator receives only bounded sanitized collection improvements and no mutation authority", () => {
  let calls = 0;
  const vaultService = {
    stats,
    keeperContext() {
      return { summary: stats(), recentTreasures: [] };
    },
    getTreasure() {
      throw new Error("No treasure detail should be required in this fixture.");
    }
  };
  const improvementService = {
    list(identity, options) {
      calls += 1;
      assert.equal(identity.id, collector.id);
      assert.deepEqual(options, { limit: 5 });
      return Array.from({ length: 7 }, (_, index) => ({
        id: `improvement-${index + 1}`,
        priority: index === 0 ? "high" : "medium",
        title: `Improvement ${index + 1}`,
        affectedCount: index + 1,
        reason: `Grounded reason ${index + 1}`,
        action: `Grounded action ${index + 1}`,
        basis: "authenticated-collector-vault-state",
        automaticApplication: false,
        examples: [
          { id: `example-${index + 1}-a`, title: `Example ${index + 1} A`, sourceReference: "must-not-leak" },
          { id: `example-${index + 1}-b`, title: `Example ${index + 1} B`, notes: "must-not-leak" },
          { id: `example-${index + 1}-c`, title: `Example ${index + 1} C` }
        ],
        internalSql: "must-not-leak"
      }));
    }
  };

  const intelligence = createVaultIntelligence({ vaultService, improvementService });
  const context = intelligence.keeperContext(collector, "How can I improve my collection?");
  assert.equal(calls, 1);
  assert.equal(context.collectionImprovements.length, 5);
  assert.ok(context.collectionImprovements.every((item) => item.examples.length <= 2));
  assert.ok(context.collectionImprovements.every((item) => item.automaticApplication === false));
  assert.equal(context.contextPolicy.maximumCollectionImprovements, 5);
  assert.equal(context.contextPolicy.maximumImprovementExamples, 2);
  assert.equal(context.contextPolicy.collectionImprovementsAutomatic, false);
  assert.doesNotMatch(JSON.stringify(context), /must-not-leak|internalSql|sourceReference/);

  const hall = createGreatHallService({ identityService, vaultService: intelligence });
  const request = hall.keeperRouteRequest(collector, {
    roomId: "vault",
    message: "How can I improve my collection?"
  });
  const system = request.messages[0].content;
  assert.match(system, /Improvement 1/);
  assert.match(system, /collectionImprovementsAutomatic/);
  assert.doesNotMatch(system, /must-not-leak/);
});

test("non-Vault Keeper conversations do not retrieve collection improvement context", () => {
  let calls = 0;
  const vaultService = {
    stats,
    keeperContext() {
      return { summary: stats(), recentTreasures: [] };
    }
  };
  const improvementService = {
    list() {
      calls += 1;
      return [];
    }
  };
  const intelligence = createVaultIntelligence({ vaultService, improvementService });
  const hall = createGreatHallService({ identityService, vaultService: intelligence });
  const request = hall.keeperRouteRequest(collector, {
    roomId: "great-hall",
    message: "What rooms are open?"
  });

  assert.equal(calls, 0);
  assert.doesNotMatch(request.messages[0].content, /Authorized Royal Vault context/);
});
