import test from "node:test";
import assert from "node:assert/strict";
import { createGreatHallService } from "../packages/great-hall/src/service.mjs";

const collector = Object.freeze({
  id: "collector-curator",
  displayName: "Curator Collector",
  roles: ["collector"],
  emailVerified: true
});

const identityService = Object.freeze({
  listRecentActivity() { return []; }
});

function stats() {
  return {
    treasureCount: 1,
    unitCount: 1,
    usdEstimatedValueCents: 0,
    categoryCount: 1,
    duplicateGroups: 0,
    categories: [{ category: "Sports Cards", count: 1, units: 1 }]
  };
}

test("Royal Curator receives the collector question for query-relevant Vault retrieval", () => {
  let receivedQuery = null;
  const vaultService = {
    stats,
    keeperContext(identity, query) {
      assert.equal(identity.id, collector.id);
      receivedQuery = query;
      return {
        summary: stats(),
        recentTreasures: [],
        queryMatches: [{
          id: "jordan-57",
          title: "1986 Fleer Michael Jordan #57",
          category: "Sports Cards",
          condition: "Graded",
          details: [
            { label: "Team", value: "Chicago Bulls", sourceType: "collector-entered", verificationStatus: "not-checked", verificationProvider: null },
            { label: "Grade", value: "9", sourceType: "collector-entered", verificationStatus: "not-checked", verificationProvider: "PSA" }
          ]
        }],
        contextPolicy: { verificationReferencesIncluded: false }
      };
    }
  };

  const hall = createGreatHallService({ identityService, vaultService });
  const request = hall.keeperRouteRequest(collector, {
    roomId: "vault",
    message: "Where is my PSA 9 Jordan Bulls card?"
  });

  assert.equal(receivedQuery, "Where is my PSA 9 Jordan Bulls card?");
  const system = request.messages[0].content;
  assert.match(system, /1986 Fleer Michael Jordan #57/);
  assert.match(system, /Chicago Bulls/);
  assert.match(system, /PSA/);
  assert.match(system, /verificationReferencesIncluded/);
});

test("non-Vault Keeper conversations do not expose Vault retrieval context", () => {
  let calls = 0;
  const vaultService = {
    stats,
    keeperContext() {
      calls += 1;
      return { summary: stats(), recentTreasures: [], queryMatches: [] };
    }
  };

  const hall = createGreatHallService({ identityService, vaultService });
  const request = hall.keeperRouteRequest(collector, {
    roomId: "great-hall",
    message: "What rooms are available?"
  });

  assert.equal(calls, 0);
  assert.doesNotMatch(request.messages[0].content, /Authorized Royal Vault context/);
});
