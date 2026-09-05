import test from "node:test";
import assert from "node:assert/strict";
import { createGreatHallService } from "../packages/great-hall/src/service.mjs";
import { createVaultIntelligence } from "../packages/vault/src/intelligence.mjs";

const collector = Object.freeze({
  id: "collector-duplicate-curator",
  displayName: "Duplicate Curator",
  roles: ["collector"],
  emailVerified: true
});

const identityService = Object.freeze({ listRecentActivity() { return []; } });

function stats() {
  return {
    treasureCount: 2,
    unitCount: 2,
    usdEstimatedValueCents: 0,
    categoryCount: 1,
    duplicateGroups: 1,
    categories: [{ category: "Sports Cards", count: 2, units: 2 }]
  };
}

test("Royal Curator receives bounded sanitized possible-duplicate records and no merge authority", () => {
  let calls = 0;
  const vaultCore = {
    stats,
    keeperContext() {
      return { summary: stats(), recentTreasures: [] };
    }
  };
  const duplicateSummaryService = {
    list(identity, options) {
      calls += 1;
      assert.equal(identity.id, collector.id);
      assert.deepEqual(options, { limit: 5, treasuresPerGroup: 4 });
      return [{
        count: 2,
        returnedTreasureCount: 2,
        truncated: false,
        matchingFields: {
          title: "1986 Fleer Michael Jordan #57",
          category: "Sports Cards",
          series: "Fleer",
          manufacturer: "Fleer",
          year: 1986
        },
        treasures: [
          {
            id: "jordan-a",
            title: "1986 Fleer Michael Jordan #57",
            category: "Sports Cards",
            series: "Fleer",
            manufacturer: "Fleer",
            year: 1986,
            condition: "Graded",
            quantity: 1,
            locationName: "Safe A"
          },
          {
            id: "jordan-b",
            title: "1986 Fleer Michael Jordan #57",
            category: "Sports Cards",
            series: "Fleer",
            manufacturer: "Fleer",
            year: 1986,
            condition: "Raw",
            quantity: 1,
            locationName: "Binder 2"
          }
        ],
        explanation: "Possible duplicate records share normalized title, category, series, publisher/manufacturer, and year. They remain separate Vault records until the collector decides otherwise."
      }];
    }
  };

  const intelligence = createVaultIntelligence({ vaultService: vaultCore, duplicateSummaryService });
  const context = intelligence.keeperContext(collector, "Do I have duplicate Jordan cards?");
  assert.equal(calls, 1);
  assert.equal(context.duplicateGroups.length, 1);
  assert.equal(context.duplicateGroups[0].treasures.length, 2);
  assert.equal(context.contextPolicy.maximumDuplicateGroups, 5);
  assert.equal(context.contextPolicy.maximumTreasuresPerDuplicateGroup, 4);
  assert.equal(context.contextPolicy.duplicateAutomaticMerge, false);
  assert.equal(context.contextPolicy.duplicateAutomaticDelete, false);
  assert.equal(context.contextPolicy.duplicateCollectorDecisionRequired, true);
  assert.doesNotMatch(JSON.stringify(context.duplicateGroups), /notes|sha256|verificationReference|duplicateKey/i);

  const hall = createGreatHallService({ identityService, vaultService: intelligence });
  const request = hall.keeperRouteRequest(collector, {
    roomId: "vault",
    message: "Do I have duplicate Jordan cards?"
  });
  const system = request.messages[0].content;
  assert.match(system, /jordan-a/);
  assert.match(system, /jordan-b/);
  assert.match(system, /duplicateAutomaticMerge/);
  assert.match(system, /collector explicitly decides otherwise/);
});
