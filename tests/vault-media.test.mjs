import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultMediaRepository } from "../packages/vault/src/media-repository.mjs";
import { createVaultMediaService } from "../packages/vault/src/media-service.mjs";
import { LocalVaultMediaStorage } from "../packages/vault/src/media-storage.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collectorA = Object.freeze({ id: "collector-a", roles: ["collector"] });
const collectorB = Object.freeze({ id: "collector-b", roles: ["collector"] });

function pngBytes() {
  const bytes = Buffer.alloc(32);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  Buffer.from("IHDR", "ascii").copy(bytes, 12);
  return bytes;
}

async function withMedia(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-media-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store: vaultStore });
  const mediaRepository = createVaultMediaRepository({ vaultStore });
  const storage = new LocalVaultMediaStorage(join(directory, "private-media"));
  const media = createVaultMediaService({ vaultStore, mediaRepository, storage });
  try {
    await run({ vault, media, vaultStore });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("Vault media stores validated private bytes and enforces owner isolation", async () => {
  await withMedia(async ({ vault, media }) => {
    const treasure = vault.createTreasure(collectorA, {
      title: "Amazing Fantasy #15",
      category: "Comic Book"
    });

    const created = await media.add(collectorA, treasure.id, {
      bytes: pngBytes(),
      contentType: "image/png",
      originalName: "front-cover.png"
    });

    assert.equal(created.treasureId, treasure.id);
    assert.equal(created.mediaKind, "image");
    assert.equal(created.contentType, "image/png");
    assert.match(created.url, /^\/api\/vault\/media\//);

    const listed = media.list(collectorA, treasure.id);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].id, created.id);

    const read = await media.read(collectorA, created.id);
    assert.deepEqual(read.bytes, pngBytes());

    assert.throws(
      () => media.list(collectorB, treasure.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );
    await assert.rejects(
      () => media.read(collectorB, created.id),
      (error) => error instanceof VaultError && error.code === "media_not_found"
    );

    const history = vault.history(collectorA, treasure.id);
    assert.equal(history[0].eventType, "vault.media_added");
    assert.equal(history[0].metadata.mediaId, created.id);
    assert.match(history[0].metadata.sha256, /^[a-f0-9]{64}$/);

    const removed = await media.remove(collectorA, created.id);
    assert.equal(removed.removed, true);
    assert.equal(media.list(collectorA, treasure.id).length, 0);
    await assert.rejects(
      () => media.read(collectorA, created.id),
      (error) => error instanceof VaultError && error.code === "media_not_found"
    );

    const afterRemovalHistory = vault.history(collectorA, treasure.id);
    assert.equal(afterRemovalHistory[0].eventType, "vault.media_removed");
  });
});

test("Vault media rejects spoofed types, mismatched extensions, unsafe names, and unsupported files", async () => {
  await withMedia(async ({ vault, media }) => {
    const treasure = vault.createTreasure(collectorA, { title: "Test Treasure", category: "Other" });

    await assert.rejects(
      () => media.add(collectorA, treasure.id, {
        bytes: pngBytes(),
        contentType: "image/jpeg",
        originalName: "photo.jpg"
      }),
      (error) => error instanceof VaultError && error.code === "media_type_mismatch" && error.statusCode === 415
    );

    await assert.rejects(
      () => media.add(collectorA, treasure.id, {
        bytes: pngBytes(),
        contentType: "image/png",
        originalName: "photo.jpg"
      }),
      (error) => error instanceof VaultError && error.code === "media_extension_mismatch"
    );

    await assert.rejects(
      () => media.add(collectorA, treasure.id, {
        bytes: pngBytes(),
        contentType: "image/png",
        originalName: "../photo.png"
      }),
      (error) => error instanceof VaultError && error.code === "invalid_media_filename"
    );

    await assert.rejects(
      () => media.add(collectorA, treasure.id, {
        bytes: Buffer.from("<svg><script>alert(1)</script></svg>"),
        contentType: "image/svg+xml",
        originalName: "unsafe.svg"
      }),
      (error) => error instanceof VaultError && error.code === "unsupported_media_type" && error.statusCode === 415
    );

    assert.equal(media.list(collectorA, treasure.id).length, 0);
  });
});
