import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogCandidateDraft,
  catalogCandidateSummary,
  catalogReviewPolicy
} from "../apps/web/public/vault-catalog-core.js";
import { intakeTypeLabel, treasurePrefillFromIntake } from "../apps/web/public/vault-intake-core.js";

test("Royal Intake exposes both exact Pokémon lookup modes as catalog-family identifiers", () => {
  assert.equal(intakeTypeLabel("pokemon-set-number"), "Pokémon set + card number");
  assert.equal(intakeTypeLabel("pokemon-card-id"), "Pokémon card ID");
  for (const [identifierType, identifierValue] of [
    ["pokemon-set-number", "base1/4"],
    ["pokemon-card-id", "base1-4"]
  ]) {
    const prefill = treasurePrefillFromIntake({ identifierType, identifierValue, captureCount: 1 });
    assert.equal(prefill.fieldSelector, "#treasure-catalog");
    assert.equal(prefill.value, identifierValue);
    assert.equal(catalogReviewPolicy(identifierType).supported, true);
    assert.match(catalogReviewPolicy(identifierType).actionLabel, /Pokémon card candidate/i);
  }
});

test("Pokémon provider candidate becomes an unsaved Trading Card draft without prices, grade, or physical variant", () => {
  const candidate = {
    providerId: "pokemon-tcg",
    providerName: "Pokémon TCG API",
    providerRecordId: "base1-4",
    sourceUrl: "https://api.pokemontcg.io/v2/cards/base1-4",
    fields: {
      title: "Charizard",
      providerCategory: "Pokémon Trading Card Game",
      series: "Base",
      setName: "Base",
      setId: "base1",
      cardNumber: "4",
      printedSetTotal: 102,
      setTotal: 102,
      rarity: "Rare Holo",
      artist: "Mitsuhiro Arita",
      supertype: "Pokémon",
      subtypes: ["Stage 2"],
      types: ["Fire"],
      hp: "120",
      releaseDate: "1999/01/09",
      tcgplayer: { prices: { holofoil: { market: 999.99 } } }
    },
    externalIdentifiers: {
      pokemonTcgCardId: "base1-4",
      pokemonTcgSetId: "base1",
      pokemonCardNumber: "4",
      lookupCode: "base1/4"
    },
    tcgplayer: { prices: { holofoil: { market: 888.88 } } },
    cardmarket: { prices: { averageSellPrice: 777.77 } }
  };

  const draft = catalogCandidateDraft(
    { identifierType: "pokemon-set-number", identifierValue: "base1/4" },
    candidate
  );

  assert.equal(draft.title, "Charizard");
  assert.equal(draft.category, "Trading Card");
  assert.equal(draft.manufacturer, "Pokémon");
  assert.equal(draft.series, "Base");
  assert.equal(draft.catalogIdentifier, "base1/4");
  assert.equal(draft.barcode, null);
  assert.equal(draft.attributes.cardGame, "Pokémon TCG");
  assert.equal(draft.attributes.pokemonTcgCardId, "base1-4");
  assert.equal(draft.attributes.pokemonSetId, "base1");
  assert.equal(draft.attributes.pokemonCardNumber, "4");
  assert.equal(draft.attributes.rarity, "Rare Holo");
  assert.equal(draft.attributes.variantSelectionRequired, true);
  assert.equal(draft.attributes.providerIdentificationIsNotPhysicalAuthentication, true);
  assert.equal(Object.hasOwn(draft, "variant"), false);
  assert.equal(Object.hasOwn(draft, "grade"), false);
  assert.equal(draft.reviewRequired, true);
  assert.equal(draft.mutationPerformed, false);
  assert.doesNotMatch(JSON.stringify(draft), /999\.99|888\.88|777\.77|tcgplayer|cardmarket|averageSellPrice/i);

  const summary = catalogCandidateSummary(candidate);
  assert.match(summary, /Base/);
  assert.match(summary, /Card #4/);
  assert.match(summary, /Rare Holo/);
  assert.match(summary, /Mitsuhiro Arita/);
});
