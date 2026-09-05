import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultProvenanceRepository } from "../packages/vault/src/provenance-repository.mjs";
import { createVaultProvenanceService } from "../packages/vault/src/provenance-service.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-provenance-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store, now: () => new Date("2026-09-05T12:00:00.000Z") });
  const repository = createVaultProvenanceRepository({ vaultStore: store });
  const provenance = createVaultProvenanceService({
    vaultStore: store,
    provenanceRepository: repository,
    now: () => new Date("2026-09-05T12:30:00.000Z")
  });
  try {
    await run({ store, vault, repository, provenance });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

const owner = Object.freeze({ id: "collector-owner" });
const outsider = Object.freeze({ id: "collector-outsider" });

function createTreasure(vault, identity = owner, title = "Amazing Spider-Man #300") {
  return vault.createTreasure(identity, {
    title,
    category: "Comic Book",
    quantity: 1
  });
}

test("provenance ledger appends structured collector-recorded evidence and audit history", async () => {
  await withVault(({ vault, provenance }) => {
    const treasure = createTreasure(vault);
    const acquisition = provenance.append(owner, treasure.id, {
      eventType: "acquired",
      effectiveDate: "2024-04-20",
      counterparty: "Local comic shop",
      method: "purchase",
      amountCents: 12500,
      currency: "usd",
      reference: "Receipt 420-300",
      sourceUrl: "https://example.com/receipt/420-300#copy",
      notes: "Collector-recorded acquisition evidence."
    });

    assert.equal(acquisition.eventType, "acquired");
    assert.equal(acquisition.amountCents, 12500);
    assert.equal(acquisition.currency, "USD");
    assert.equal(acquisition.evidenceClass, "collector-recorded");
    assert.equal(acquisition.independentlyVerified, false);
    assert.equal(acquisition.sourceUrl, "https://example.com/receipt/420-300");

    const timeline = provenance.list(owner, treasure.id);
    assert.equal(timeline.length, 1);
    assert.equal(timeline[0].id, acquisition.id);

    const audit = vault.history(owner, treasure.id, { limit: 20 });
    assert.ok(audit.some((event) => event.eventType === "vault.provenance_appended" && event.metadata.provenanceEventId === acquisition.id));
  });
});

test("provenance events are owner isolated and correction targets must belong to the same treasure", async () => {
  await withVault(({ vault, provenance }) => {
    const first = createTreasure(vault, owner, "First treasure");
    const second = createTreasure(vault, owner, "Second treasure");
    const event = provenance.append(owner, first.id, {
      eventType: "ownership-note",
      effectiveDate: "2020-01-01",
      notes: "Reported prior owner was a private collector."
    });

    assert.throws(
      () => provenance.list(outsider, first.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found" && error.statusCode === 404
    );
    assert.throws(
      () => provenance.append(outsider, first.id, { eventType: "documented", notes: "Unauthorized" }),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );
    assert.throws(
      () => provenance.append(owner, second.id, { eventType: "correction", correctsEventId: event.id, notes: "Wrong treasure target" }),
      (error) => error instanceof VaultError && error.code === "provenance_correction_target_not_found"
    );

    const correction = provenance.append(owner, first.id, {
      eventType: "correction",
      correctsEventId: event.id,
      effectiveDate: "2020-01-02",
      notes: "Correction: prior-owner date was reported one day later."
    });
    assert.equal(correction.correctsEventId, event.id);
    assert.equal(provenance.list(owner, first.id).length, 2);
  });
});

test("provenance monetary facts require internally consistent currency and event validation", async () => {
  await withVault(({ vault, provenance }) => {
    const treasure = createTreasure(vault);

    assert.throws(
      () => provenance.append(owner, treasure.id, { eventType: "sold", amountCents: 20000 }),
      (error) => error instanceof VaultError && error.code === "provenance_currency_required"
    );
    assert.throws(
      () => provenance.append(owner, treasure.id, { eventType: "sold", currency: "USD" }),
      (error) => error instanceof VaultError && error.code === "provenance_amount_required"
    );
    assert.throws(
      () => provenance.append(owner, treasure.id, { eventType: "invented-event" }),
      (error) => error instanceof VaultError && error.code === "invalid_provenance_event_type"
    );
    assert.throws(
      () => provenance.append(owner, treasure.id, { eventType: "correction", notes: "No target" }),
      (error) => error instanceof VaultError && error.code === "provenance_correction_target_required"
    );
    assert.throws(
      () => provenance.append(owner, treasure.id, { eventType: "acquired", correctsEventId: "not-valid-here" }),
      (error) => error instanceof VaultError && error.code === "invalid_provenance_correction_target"
    );
  });
});

test("provenance survives treasure archive and repository exposes no destructive mutation methods", async () => {
  await withVault(({ vault, repository, provenance }) => {
    const treasure = createTreasure(vault);
    const acquisition = provenance.append(owner, treasure.id, {
      eventType: "acquired",
      effectiveDate: "2022-02-02",
      method: "gift",
      notes: "Gift from family collection."
    });
    vault.archiveTreasure(owner, treasure.id);

    const timeline = provenance.list(owner, treasure.id);
    assert.equal(timeline.length, 1);
    assert.equal(timeline[0].id, acquisition.id);

    const correction = provenance.append(owner, treasure.id, {
      eventType: "correction",
      correctsEventId: acquisition.id,
      notes: "Added clarification after archival."
    });
    assert.equal(correction.correctsEventId, acquisition.id);
    assert.equal(provenance.exportAll(owner).length, 2);

    assert.equal("update" in repository, false);
    assert.equal("remove" in repository, false);
    assert.equal("delete" in repository, false);
  });
});
