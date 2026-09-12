import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  ingestMtgjsonPriceRow,
  MTGJSON_PRICE_AUTHORITY,
  normalizeMtgjsonPriceRow
} from "../packages/vault/src/mtgjson-price-adapter.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";
import { createVaultValuationRepository } from "../packages/vault/src/valuation-repository.mjs";
import { createVaultValuationService } from "../packages/vault/src/valuation-service.mjs";

const NOW = new Date("2026-09-12T18:00:00.000Z");
const owner = Object.freeze({ id: "collector-owner" });
const UUID = "00010d56-fe38-5e35-8aed-518019aa36a5";

function row(overrides = {}) {
  return {
    mtgjsonUuid: UUID,
    format: "paper",
    provider: "tcgplayer",
    listType: "retail",
    cardType: "normal",
    date: "2026-09-12",
    price: 10.05,
    currency: "USD",
    providerBuildAt: "2026-09-12T13:00:00.000Z",
    retrievedAt: "2026-09-12T17:00:00.000Z",
    ...overrides
  };
}

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-mtgjson-adapter-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store, now: () => NOW });
  const valuationRepository = createVaultValuationRepository({ vaultStore: store });
  const valuation = createVaultValuationService({ vaultStore: store, valuationRepository, now: () => NOW });
  try {
    await run({ vault, valuation });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("MTGJSON rows preserve retail/buylist semantics, date, provider, finish, currency and exact provider identity", () => {
  const retail = normalizeMtgjsonPriceRow(row());
  assert.equal(retail.observationType, "retail-price");
  assert.equal(retail.amountCents, 1005);
  assert.equal(retail.currency, "USD");
  assert.equal(retail.marketVariant, "normal");
  assert.equal(retail.providerItemReference, `mtgjson:${UUID}`);
  assert.equal(retail.providerObservationId, `${UUID}:paper:tcgplayer:retail:normal:USD:2026-09-12`);
  assert.match(retail.notes, /not evidence of a completed sale/i);

  const buylist = normalizeMtgjsonPriceRow(row({
    provider: "cardkingdom",
    listType: "buylist",
    cardType: "foil",
    price: "7.545"
  }));
  assert.equal(buylist.observationType, "buylist-price");
  assert.equal(buylist.marketVariant, "foil");
  assert.equal(buylist.amountCents, 755);
  assert.match(buylist.providerObservationId, /cardkingdom:buylist:foil/);

  assert.equal(MTGJSON_PRICE_AUTHORITY.providerId, "mtgjson");
  assert.equal(MTGJSON_PRICE_AUTHORITY.providerPolicyId, "mtgjson:mit:v5-price-data");
  assert.deepEqual(MTGJSON_PRICE_AUTHORITY.allowedObservationTypes, ["retail-price", "buylist-price"]);
});

test("MTGJSON adapter refuses ambiguous or semantically unsupported price rows", () => {
  assert.throws(
    () => normalizeMtgjsonPriceRow(row({ currency: null })),
    (error) => error instanceof VaultError && error.code === "invalid_mtgjson_currency"
  );
  assert.throws(
    () => normalizeMtgjsonPriceRow(row({ listType: "sold" })),
    (error) => error instanceof VaultError && error.code === "invalid_mtgjson_list_type"
  );
  assert.throws(
    () => normalizeMtgjsonPriceRow(row({ cardType: "graded" })),
    (error) => error instanceof VaultError && error.code === "invalid_mtgjson_card_type"
  );
  assert.throws(
    () => normalizeMtgjsonPriceRow(row({ mtgjsonUuid: "not-a-uuid" })),
    (error) => error instanceof VaultError && error.code === "invalid_mtgjson_uuid"
  );
});

test("MTGJSON adapter ingests through trusted provider authority and remains outside sold-comparable estimate", async () => {
  await withVault(({ vault, valuation }) => {
    const treasure = vault.createTreasure(owner, { title: "Phelddagrif", category: "Trading Card" });
    const result = ingestMtgjsonPriceRow({ valuationService: valuation, identity: owner, treasureId: treasure.id, row: row() });
    assert.equal(result.created, true);
    assert.equal(result.observation.providerId, "mtgjson");
    assert.equal(result.observation.observationType, "retail-price");
    assert.equal(result.observation.influencesCurrentEstimate, false);

    const snapshot = valuation.snapshot(owner, treasure.id);
    assert.equal(snapshot.providerObservationCount, 1);
    assert.equal(snapshot.bucketCount, 0);
    assert.equal(snapshot.history.providerMarketObservationCount, 1);
    assert.equal(snapshot.history.entries[0].providerId, "mtgjson");
    assert.equal(snapshot.history.entries[0].observationType, "retail-price");
    assert.equal(snapshot.history.entries[0].influencesCurrentEstimate, false);
  });
});
