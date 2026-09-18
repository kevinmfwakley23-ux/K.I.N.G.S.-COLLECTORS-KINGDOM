import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceService } from "../packages/marketplace/src/service.mjs";
import { createMarketplaceTransactionRuntime } from "../packages/marketplace/src/transaction-runtime.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

test("production transaction runtime preserves reservation recovery while adding fulfillment evidence authority", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-fulfillment-runtime-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  try {
    const marketplaceRepository = createMarketplaceRepository({ vaultStore });
    const marketplaceService = createMarketplaceService({ vaultStore, marketplaceRepository });
    const runtime = createMarketplaceTransactionRuntime({
      env: {
        KINGDOM_MARKETPLACE_PUBLIC_BASE_URL: "http://127.0.0.1:8788",
        KINGDOM_MARKETPLACE_CHECKOUT_ENABLED: "false",
        KINGDOM_STRIPE_TAX_ENABLED: "false",
        KINGDOM_MARKETPLACE_SHIPPING_COUNTRIES: "US"
      },
      vaultStore,
      marketplaceRepository,
      marketplaceService,
      now: () => new Date("2026-09-18T08:00:00.000Z")
    });

    assert.equal(runtime.service.reservationRecoveryAvailable, true);
    assert.equal(runtime.service.checkoutEnabled, false);
    assert.ok(runtime.fulfillmentRepository);
    assert.ok(runtime.fulfillmentService);

    const capabilities = runtime.fulfillmentService.capabilities();
    assert.equal(capabilities.sellerShipmentEvidenceAvailable, true);
    assert.equal(capabilities.shipmentEvidenceIntegrityAvailable, true);
    assert.equal(capabilities.appendOnlyEvidenceTimelineAvailable, true);
    assert.equal(capabilities.carrierVerificationAvailable, false);
    assert.equal(capabilities.deliveryVerificationAvailable, false);
    assert.equal(capabilities.ownershipTransferAvailable, false);

    const shipmentTable = vaultStore.database.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'marketplace_shipments'"
    ).get();
    assert.equal(shipmentTable.name, "marketplace_shipments");

    const orderColumns = vaultStore.database.prepare("PRAGMA table_info(marketplace_orders)").all().map((row) => row.name);
    assert.ok(orderColumns.includes("reservation_expires_at"));
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
});
