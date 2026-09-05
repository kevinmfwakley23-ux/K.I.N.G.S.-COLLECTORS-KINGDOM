import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { handleVaultSetRequest } from "../packages/vault/src/sets-http.mjs";
import { createVaultSetService } from "../packages/vault/src/sets.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const owner = Object.freeze({ id: "set-http-owner", displayName: "Set HTTP Owner" });
const other = Object.freeze({ id: "set-http-other", displayName: "Other Collector" });

function request(method, body, contentType = "application/json") {
  const bytes = body === undefined ? [] : [Buffer.from(typeof body === "string" ? body : JSON.stringify(body))];
  const stream = Readable.from(bytes);
  stream.method = method;
  stream.headers = { "content-type": contentType };
  return stream;
}

async function withServices(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-set-http-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  const sets = createVaultSetService({ filename });
  try {
    await run({ vault, sets });
  } finally {
    sets.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

async function call(sets, identity, pathname, method = "GET", body) {
  return handleVaultSetRequest({
    request: request(method, body),
    pathname,
    identity,
    setService: sets
  });
}

test("collection set HTTP contract creates explicit checklists, links owned treasures, and derives incomplete sets", async () => {
  await withServices(async ({ vault, sets }) => {
    const created = await call(sets, owner, "/api/vault/sets", "POST", {
      name: "1986 Fleer Basketball",
      category: "Sports Cards",
      series: "1986-87 Fleer"
    });
    assert.equal(created.status, 201);
    const setId = created.payload.set.id;

    const jordanEntry = await call(sets, owner, `/api/vault/sets/${setId}/entries`, "POST", {
      entryKey: "57",
      label: "Michael Jordan #57"
    });
    const stickerEntry = await call(sets, owner, `/api/vault/sets/${setId}/entries`, "POST", {
      entryKey: "sticker-8",
      label: "Michael Jordan Sticker #8"
    });
    assert.equal(jordanEntry.status, 201);
    assert.equal(stickerEntry.status, 201);

    const treasure = vault.createTreasure(owner, {
      title: "1986 Fleer Michael Jordan #57",
      category: "Sports Cards"
    });
    const linked = await call(
      sets,
      owner,
      `/api/vault/sets/${setId}/entries/${jordanEntry.payload.entry.id}/treasures/${treasure.id}`,
      "PUT",
      { quantity: 1 }
    );
    assert.equal(linked.status, 200);
    assert.equal(linked.payload.link.changed, true);

    const detail = await call(sets, owner, `/api/vault/sets/${setId}`);
    assert.equal(detail.payload.set.expectedEntryCount, 2);
    assert.equal(detail.payload.set.completeEntryCount, 1);
    assert.equal(detail.payload.set.missingEntryCount, 1);
    assert.equal(detail.payload.set.completionPercent, 50);

    const incomplete = await call(sets, owner, "/api/vault/sets/incomplete");
    assert.deepEqual(incomplete.payload.sets.map((item) => item.id), [setId]);

    const secondTreasure = vault.createTreasure(owner, {
      title: "1986 Fleer Michael Jordan Sticker #8",
      category: "Sports Cards"
    });
    await call(
      sets,
      owner,
      `/api/vault/sets/${setId}/entries/${stickerEntry.payload.entry.id}/treasures/${secondTreasure.id}`,
      "PUT",
      { quantity: 1 }
    );

    const complete = await call(sets, owner, `/api/vault/sets/${setId}`);
    assert.equal(complete.payload.set.complete, true);
    assert.equal(complete.payload.set.completionPercent, 100);
    assert.deepEqual((await call(sets, owner, "/api/vault/sets/incomplete")).payload.sets, []);
  });
});

test("collection set HTTP contract remains owner scoped and refuses implicit cross-set assumptions", async () => {
  await withServices(async ({ vault, sets }) => {
    const setId = (await call(sets, owner, "/api/vault/sets", "POST", {
      name: "Hot Wheels Color Variants",
      category: "Hot Wheels"
    })).payload.set.id;
    const blue = (await call(sets, owner, `/api/vault/sets/${setId}/entries`, "POST", {
      entryKey: "model-blue",
      label: "Model Blue"
    })).payload.entry;
    const red = (await call(sets, owner, `/api/vault/sets/${setId}/entries`, "POST", {
      entryKey: "model-red",
      label: "Model Red"
    })).payload.entry;
    const treasure = vault.createTreasure(owner, { title: "Hot Wheels Model Blue", category: "Hot Wheels" });

    await call(sets, owner, `/api/vault/sets/${setId}/entries/${blue.id}/treasures/${treasure.id}`, "PUT", { quantity: 1 });
    await assert.rejects(
      () => call(sets, owner, `/api/vault/sets/${setId}/entries/${red.id}/treasures/${treasure.id}`, "PUT", { quantity: 1 }),
      (error) => error instanceof VaultError && error.code === "treasure_already_linked_to_set"
    );
    await assert.rejects(
      () => call(sets, other, `/api/vault/sets/${setId}`),
      (error) => error instanceof VaultError && error.code === "collection_set_not_found"
    );
  });
});

test("collection set HTTP writes require JSON and valid encoded paths", async () => {
  await withServices(async ({ sets }) => {
    await assert.rejects(
      () => handleVaultSetRequest({
        request: request("POST", "name=bad", "text/plain"),
        pathname: "/api/vault/sets",
        identity: owner,
        setService: sets
      }),
      (error) => error instanceof VaultError && error.code === "unsupported_media_type" && error.statusCode === 415
    );

    await assert.rejects(
      () => handleVaultSetRequest({
        request: request("GET"),
        pathname: "/api/vault/sets/%E0%A4%A",
        identity: owner,
        setService: sets
      }),
      (error) => error instanceof VaultError && error.code === "invalid_path_segment"
    );
  });
});
