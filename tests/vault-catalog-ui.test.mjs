import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogCandidateDraft,
  catalogCandidateSummary,
  catalogReviewPolicy
} from "../apps/web/public/vault-catalog-core.js";

test("catalog review UI is enabled only for verified ISBN, UPC, and EAN workflows", () => {
  assert.equal(catalogReviewPolicy("isbn").supported, true);
  assert.equal(catalogReviewPolicy("UPC").supported, true);
  assert.equal(catalogReviewPolicy("ean").supported, true);
  assert.equal(catalogReviewPolicy("barcode").supported, false);
  assert.equal(catalogReviewPolicy("serial").supported, false);
  assert.match(catalogReviewPolicy("upc").actionLabel, /product candidates/i);
});

test("Open Library candidate draft stays unsaved and preserves evidence metadata", () => {
  const draft = catalogCandidateDraft(
    { identifierType: "isbn", identifierValue: "9780140328721" },
    {
      providerId: "open-library",
      providerName: "Open Library",
      providerRecordId: "OL45804W",
      sourceUrl: "https://openlibrary.org/works/OL45804W",
      fields: {
        title: "Fantastic Mr. Fox",
        creators: ["Roald Dahl"],
        publisher: "Puffin",
        firstPublishYear: 1970,
        languages: ["eng"]
      },
      externalIdentifiers: { isbn: "9780140328721" }
    }
  );

  assert.equal(draft.title, "Fantastic Mr. Fox");
  assert.equal(draft.category, "Book");
  assert.equal(draft.manufacturer, "Puffin");
  assert.equal(draft.barcode, "9780140328721");
  assert.equal(draft.attributes.author, "Roald Dahl");
  assert.equal(draft.attributes.catalogEvidenceProvider, "Open Library");
  assert.equal(draft.reviewRequired, true);
  assert.equal(draft.mutationPerformed, false);
});

test("UPCitemdb candidate draft intentionally excludes merchant price and offer data", () => {
  const draft = catalogCandidateDraft(
    { identifierType: "upc", identifierValue: "045496630584" },
    {
      providerId: "upcitemdb",
      providerName: "UPCitemdb",
      providerRecordId: "045496630584",
      sourceUrl: "https://www.upcitemdb.com/",
      fields: {
        title: "Nintendo Switch Game",
        manufacturer: "Nintendo",
        description: "Retail product metadata for collector review.",
        model: "HAC-P-AAAAA",
        color: "Red",
        size: "Standard",
        providerCategory: "Video Games",
        lowestRecordedPrice: 19.99,
        offers: [{ merchant: "Example", price: 29.99 }]
      },
      externalIdentifiers: {
        upc: "045496630584",
        lookupCode: "045496630584"
      },
      price: 999.99,
      offers: [{ merchant: "Outside candidate", price: 999.99 }]
    }
  );

  assert.equal(draft.title, "Nintendo Switch Game");
  assert.equal(draft.category, null);
  assert.equal(draft.manufacturer, "Nintendo");
  assert.equal(draft.barcode, "045496630584");
  assert.equal(draft.attributes.model, "HAC-P-AAAAA");
  assert.equal(draft.attributes.providerCategory, "Video Games");
  const serialized = JSON.stringify(draft);
  assert.doesNotMatch(serialized, /19\.99|29\.99|999\.99|offers|merchant|lowestRecordedPrice/i);
  assert.equal(draft.reviewRequired, true);
  assert.equal(draft.mutationPerformed, false);
});

test("catalog candidate summaries remain metadata-only", () => {
  const summary = catalogCandidateSummary({
    fields: {
      manufacturer: "Nintendo",
      model: "HAC-P-AAAAA",
      providerCategory: "Video Games"
    }
  });
  assert.match(summary, /Nintendo/);
  assert.match(summary, /HAC-P-AAAAA/);
  assert.match(summary, /Video Games/);
});
