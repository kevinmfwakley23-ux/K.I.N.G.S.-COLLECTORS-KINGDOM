import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { handleVaultMarketplaceReadinessRequest } from "../packages/vault/src/marketplace-readiness-http.mjs";
import { createVaultMarketplaceReadinessService } from "../packages/vault/src/marketplace-readiness.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const owner = Object.freeze({ id: "market-http-owner", displayName: "Marketplace HTTP Owner" });
const other = Object.freeze({ id: "market-http-other", displayName: "Other Collector" });
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n1cAAAAASUVORK5CYII=",
  "base64"
);

function request(method, body, contentType = "application/json") {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(typeof body === "string" ? body : JSON.stringify(body))]);
  stream.method = method;
  stream.headers = { "content-type": contentType };
  return stream;
}

async function withServices(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-http-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  const readiness = createVaultMarketplaceReadinessService({ filename });
  try {
    await run({ vault, readiness });
  } finally {
    readiness.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

async function call(readiness, identity, pathname, method = "GET", body, contentType) {
  return handleVaultMarketplaceReadinessRequest({
    request: request(method, body, contentType),
    pathname,
    identity,
    readinessService: readiness
  });
}

test("Marketplace readiness HTTP contract exposes derived handoff status and private draft updates", async () => {
  await withServices(async ({ vault, readiness }) => {
    const treasure = vault.createTreasure(owner, {
      title: "Vintage Comic",
      category: "Comic Books",
      condition: "Fine"
    });

    let response = await call(readiness, owner, `/api/vault/treasures/${treasure.id}/marketplace-preparation`);
    assert.equal(response.status, 200);
    assert.equal(response.payload.readiness.ready, false);
    assert.ok(response.payload.readiness.missingChecks.includes("actual-photo"));

    await vault.addImage(owner, treasure.id, {
      contentType: "image/png",
      bytes: ONE_PIXEL_PNG,
      originalName: "comic.png"
    });
    response = await call(
      readiness,
      owner,
      `/api/vault/treasures/${treasure.id}/marketplace-preparation`,
      "PATCH",
      {
        listingDescription: "The exact vintage comic shown in the Vault photograph, with issue details recorded on the treasure record.",
        conditionDisclosure: "Fine overall condition with visible age-related edge wear shown in the actual-item photograph."
      }
    );
    assert.equal(response.payload.readiness.ready, true);

    const ready = await call(readiness, owner, "/api/vault/marketplace-ready");
    assert.equal(ready.status, 200);
    assert.equal(ready.payload.readinessScope, "vault-record-handoff");
    assert.deepEqual(ready.payload.items.map((item) => item.treasureId), [treasure.id]);
  });
});

test("Marketplace readiness HTTP contract fails closed across collectors and requires JSON for edits", async () => {
  await withServices(async ({ vault, readiness }) => {
    const treasure = vault.createTreasure(owner, {
      title: "Collector Coin",
      category: "Coins, Currency & Legal Tender",
      condition: "Uncirculated"
    });

    await assert.rejects(
      () => call(readiness, other, `/api/vault/treasures/${treasure.id}/marketplace-preparation`),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );
    await assert.rejects(
      () => call(
        readiness,
        owner,
        `/api/vault/treasures/${treasure.id}/marketplace-preparation`,
        "PATCH",
        "listingDescription=bad",
        "text/plain"
      ),
      (error) => error instanceof VaultError && error.code === "unsupported_media_type" && error.statusCode === 415
    );
  });
});
