import test from "node:test";
import assert from "node:assert/strict";
import { createGreatHallService } from "../packages/great-hall/src/service.mjs";
import { createVaultIntelligence } from "../packages/vault/src/intelligence.mjs";

const collector = Object.freeze({
  id: "collector-tag-curator",
  displayName: "Tag Curator",
  roles: ["collector"],
  emailVerified: true
});

const identityService = Object.freeze({ listRecentActivity() { return []; } });

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

test("Royal Curator receives bounded collector-pattern tag recommendations without treating them as automatic edits", () => {
  let recommendationCalls = 0;
  const treasure = {
    id: "card-1",
    title: "Championship Refractor Candidate",
    category: "Sports Cards",
    series: "Chrome Championship",
    manufacturer: "Topps",
    year: 2024,
    condition: "Near Mint",
    quantity: 1,
    tags: ["rookie"],
    location: { name: "Display Safe" },
    estimatedValueCents: null,
    estimatedValueCurrency: null,
    valuationSource: null,
    valuationAsOf: null
  };
  const vaultCore = {
    stats,
    keeperContext() {
      return { summary: stats(), recentTreasures: [{ id: treasure.id }] };
    },
    getTreasure(identity, treasureId) {
      assert.equal(identity.id, collector.id);
      assert.equal(treasureId, treasure.id);
      return treasure;
    }
  };
  const searchService = {
    searchTreasureIds(identity, query, options) {
      assert.equal(identity.id, collector.id);
      assert.match(query, /tags/i);
      assert.deepEqual(options, { limit: 8 });
      return [treasure.id];
    }
  };
  const recommendationService = {
    recommendTags(identity, treasureId, options) {
      recommendationCalls += 1;
      assert.equal(identity.id, collector.id);
      assert.equal(treasureId, treasure.id);
      assert.deepEqual(options, { limit: 3 });
      return [{
        tag: "refractor",
        basis: "collector-vault-pattern",
        strength: "moderate",
        peerCount: 2,
        explanation: "used on 2 other Sports Cards treasures in your Vault."
      }];
    }
  };
  const intelligence = createVaultIntelligence({
    vaultService: vaultCore,
    searchService,
    recommendationService
  });

  const context = intelligence.keeperContext(collector, "What tags should I use for this card?");
  assert.equal(recommendationCalls, 1, "the same treasure should use one cached recommendation lookup per Keeper context build");
  assert.equal(context.recentTreasures[0].recommendedTags[0].tag, "refractor");
  assert.equal(context.queryMatches[0].recommendedTags[0].basis, "collector-vault-pattern");
  assert.equal(context.contextPolicy.maximumRecommendedTagsPerTreasure, 3);
  assert.equal(context.contextPolicy.tagRecommendationsAutomatic, false);
  assert.match(context.contextPolicy.tagRecommendationBasis, /collector Vault patterns/i);

  const hall = createGreatHallService({ identityService, vaultService: intelligence });
  const request = hall.keeperRouteRequest(collector, {
    roomId: "vault",
    message: "What tags should I use for this card?"
  });
  const system = request.messages[0].content;
  assert.match(system, /refractor/);
  assert.match(system, /collector-vault-pattern/);
  assert.match(system, /tagRecommendationsAutomatic/);
  assert.match(system, /never auto-applied/);
});
