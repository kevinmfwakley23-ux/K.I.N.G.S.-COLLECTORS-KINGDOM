import test from "node:test";
import assert from "node:assert/strict";
import { catalogCandidateDraft, catalogCandidateSummary, catalogReviewPolicy } from "../apps/web/public/vault-catalog-core.js";
import { intakeTypeLabel, treasurePrefillFromIntake } from "../apps/web/public/vault-intake-core.js";

const UCID = "UC-1KJZD-TZG7C-6";
const USID = "US-J28FC-5H09C-4";
const PARENT_USID = "US-ABCDE-FGHIJ-K";

test("Royal Intake exposes exact sports-card UCID and set/card modes as reviewable catalog identifiers", () => {
  assert.equal(intakeTypeLabel("sports-card-ucid"), "Sports-card UCID");
  assert.equal(intakeTypeLabel("sports-card-set-number"), "Sports-card set + card number");
  for (const [identifierType, identifierValue] of [["sports-card-ucid", UCID], ["sports-card-set-number", `${USID}/27`]]) {
    const prefill = treasurePrefillFromIntake({ identifierType, identifierValue, captureCount: 1 });
    assert.equal(prefill.fieldSelector, "#treasure-catalog");
    assert.equal(prefill.value, identifierValue);
    const policy = catalogReviewPolicy(identifierType);
    assert.equal(policy.supported, true);
    assert.equal(policy.defaultCategory, "Trading Card");
    assert.match(policy.actionLabel, /sports card candidate/i);
  }
});

test("The Card API sports candidate becomes an unsaved draft without automatic parallel, condition, grade, authenticity, or value mutation", () => {
  const candidate = {
    providerId: "the-card-api",
    providerName: "The Card API",
    providerRecordId: UCID,
    sourceUrl: null,
    fields: {
      title: "Mike Trout #27",
      subject: "Mike Trout",
      providerCategory: "Sports Card",
      category: "sports",
      subcategory: "baseball",
      sport: "Baseball",
      year: 2023,
      setUsid: USID,
      setName: "2023 Topps Gold Rainbow Foil",
      parentSetUsid: PARENT_USID,
      parentSetName: "2023 Topps",
      cardNumber: "27",
      manufacturer: "Topps",
      isRookie: false,
      isAuto: false,
      isRelic: false,
      printRun: 50,
      price: 9999.99,
      marketValue: 8888.88,
      imageUrl: "https://images.example.invalid/card.jpg"
    },
    externalIdentifiers: {
      theCardApiUcid: UCID,
      theCardApiSetUsid: USID,
      sportsCardNumber: "27",
      lookupCode: `${USID}/27`
    },
    sales: [{ price: 7777.77 }]
  };

  const draft = catalogCandidateDraft({ identifierType: "sports-card-set-number", identifierValue: `${USID}/27` }, candidate);
  assert.equal(draft.title, "Mike Trout #27");
  assert.equal(draft.category, "Trading Card");
  assert.equal(draft.manufacturer, "Topps");
  assert.equal(draft.series, "2023 Topps Gold Rainbow Foil");
  assert.equal(draft.catalogIdentifier, `${USID}/27`);
  assert.equal(draft.barcode, null);
  assert.equal(draft.attributes.cardClass, "Sports Card");
  assert.equal(draft.attributes.theCardApiUcid, UCID);
  assert.equal(draft.attributes.theCardApiSetUsid, USID);
  assert.equal(draft.attributes.theCardApiParentSetUsid, PARENT_USID);
  assert.equal(draft.attributes.sportsCardParentSetName, "2023 Topps");
  assert.equal(draft.attributes.printRun, 50);
  assert.equal(draft.attributes.parallelOrInsertPhysicalMatchRequiresReview, true);
  assert.equal(draft.attributes.providerCatalogIdentityIsNotPhysicalAuthentication, true);
  assert.equal(draft.attributes.gradeConditionAndValueRequireSeparateEvidence, true);
  for (const forbidden of ["variant", "condition", "grade", "authenticity", "value", "purchasePrice", "ownership", "provenance"]) {
    assert.equal(Object.hasOwn(draft, forbidden), false);
  }
  assert.equal(draft.reviewRequired, true);
  assert.equal(draft.mutationPerformed, false);
  assert.doesNotMatch(JSON.stringify(draft), /9999\.99|8888\.88|7777\.77|images\.example|marketValue|\"sales\"/i);

  const summary = catalogCandidateSummary(candidate);
  assert.match(summary, /Sports Card/);
  assert.match(summary, /Baseball/);
  assert.match(summary, /2023 Topps Gold Rainbow Foil/);
  assert.match(summary, /Parent: 2023 Topps/);
  assert.match(summary, /Card #27/);
  assert.match(summary, /Print run \/50/);
});
