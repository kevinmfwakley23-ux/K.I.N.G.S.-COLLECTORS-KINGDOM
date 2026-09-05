import test from "node:test";
import assert from "node:assert/strict";
import { catalogCandidateDraft, catalogCandidateSummary, catalogReviewPolicy } from "../apps/web/public/vault-catalog-core.js";
import { intakeTypeLabel, treasurePrefillFromIntake } from "../apps/web/public/vault-intake-core.js";

const CARD_ID = "00000000-0000-4000-8000-000000000001";
const ORACLE_ID = "00000000-0000-4000-8000-000000000002";

test("Royal Intake exposes both exact Magic lookup modes as reviewable catalog identifiers", () => {
  assert.equal(intakeTypeLabel("mtg-set-number"), "Magic set + collector number");
  assert.equal(intakeTypeLabel("mtg-scryfall-id"), "Magic Scryfall printing ID");
  for (const [identifierType, identifierValue] of [["mtg-set-number", "lea/233"], ["mtg-scryfall-id", CARD_ID]]) {
    const prefill = treasurePrefillFromIntake({ identifierType, identifierValue, captureCount: 1 });
    assert.equal(prefill.fieldSelector, "#treasure-catalog");
    assert.equal(prefill.value, identifierValue);
    assert.equal(catalogReviewPolicy(identifierType).supported, true);
    assert.match(catalogReviewPolicy(identifierType).actionLabel, /Magic printing candidate/i);
  }
});

test("Scryfall candidate becomes an unsaved MTG draft without finish, grade, condition, or price mutation", () => {
  const candidate = {
    providerId: "scryfall",
    providerName: "Scryfall",
    providerRecordId: CARD_ID,
    sourceUrl: `https://api.scryfall.com/cards/${CARD_ID}`,
    fields: {
      title: "Black Lotus",
      providerCategory: "Magic: The Gathering",
      setCode: "lea",
      setName: "Limited Edition Alpha",
      collectorNumber: "233",
      language: "en",
      rarity: "rare",
      releasedAt: "1993-08-05",
      artist: "Christopher Rush",
      layout: "normal",
      typeLine: "Artifact",
      frame: "1993",
      borderColor: "black",
      availableFinishes: ["nonfoil"],
      promo: false,
      digital: false,
      reprint: false,
      variation: false,
      cardFaces: [],
      prices: { usd: "999999.99" }
    },
    externalIdentifiers: {
      scryfallCardId: CARD_ID,
      scryfallOracleId: ORACLE_ID,
      mtgSetCode: "lea",
      mtgCollectorNumber: "233",
      lookupCode: "lea/233"
    },
    prices: { usd: "888888.88" },
    purchase_uris: { tcgplayer: "https://shop.example.test" }
  };

  const draft = catalogCandidateDraft({ identifierType: "mtg-set-number", identifierValue: "lea/233" }, candidate);
  assert.equal(draft.title, "Black Lotus");
  assert.equal(draft.category, "Trading Card");
  assert.equal(draft.manufacturer, "Wizards of the Coast");
  assert.equal(draft.series, "Limited Edition Alpha");
  assert.equal(draft.catalogIdentifier, "lea/233");
  assert.equal(draft.barcode, null);
  assert.equal(draft.attributes.cardGame, "Magic: The Gathering");
  assert.equal(draft.attributes.scryfallCardId, CARD_ID);
  assert.equal(draft.attributes.scryfallOracleId, ORACLE_ID);
  assert.deepEqual(draft.attributes.availableFinishes, ["nonfoil"]);
  assert.equal(draft.attributes.finishSelectionRequired, true);
  assert.equal(draft.attributes.oracleIdentityIsNotPhysicalPrintingIdentity, true);
  assert.equal(draft.attributes.providerIdentificationIsNotPhysicalAuthentication, true);
  assert.equal(Object.hasOwn(draft, "variant"), false);
  assert.equal(Object.hasOwn(draft, "condition"), false);
  assert.equal(Object.hasOwn(draft, "grade"), false);
  assert.equal(draft.reviewRequired, true);
  assert.equal(draft.mutationPerformed, false);
  assert.doesNotMatch(JSON.stringify(draft), /999999\.99|888888\.88|purchase_uris|tcgplayer|prices/i);

  const summary = catalogCandidateSummary(candidate);
  assert.match(summary, /Limited Edition Alpha/);
  assert.match(summary, /Collector #233/);
  assert.match(summary, /EN/);
  assert.match(summary, /Finishes: nonfoil/);
});
