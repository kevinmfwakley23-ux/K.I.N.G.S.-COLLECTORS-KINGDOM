import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readdir, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collector = Object.freeze({ id: "media-intake-owner", displayName: "Media Intake Owner" });

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-media-intake-"));
  const filename = join(directory, "vault.sqlite");
  const mediaRoot = join(directory, "media", "vault");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot });
  try {
    await run({ directory, mediaRoot, store, vault });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("spoofed image content is rejected before any media record or file is stored", async () => {
  await withVault(async ({ mediaRoot, store, vault }) => {
    const treasure = vault.createTreasure(collector, {
      title: "Spoof Test Card",
      category: "Sports Cards"
    });

    await assert.rejects(
      () => vault.addImage(collector, treasure.id, {
        contentType: "image/jpeg",
        originalName: "looks-like-a-photo.jpg",
        bytes: Buffer.from("<html><script>alert('not an image')</script></html>", "utf8")
      }),
      (error) => error instanceof VaultError && error.code === "image_content_mismatch" && error.statusCode === 415
    );

    assert.equal(store.listMediaForTreasure(collector.id, treasure.id).length, 0);
    const treasureDirectory = join(mediaRoot, collector.id, treasure.id);
    assert.equal(await exists(treasureDirectory), false);
  });
});

test("declared image type cannot disguise another supported format", async () => {
  await withVault(async ({ store, vault }) => {
    const treasure = vault.createTreasure(collector, {
      title: "Mismatch Test Comic",
      category: "Comic Books"
    });
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

    await assert.rejects(
      () => vault.addImage(collector, treasure.id, {
        contentType: "image/jpeg",
        originalName: "wrong-extension.jpg",
        bytes: png
      }),
      (error) => error instanceof VaultError && error.code === "image_content_mismatch" && /Detected image\/png/.test(error.message)
    );
    assert.equal(store.listMediaForTreasure(collector.id, treasure.id).length, 0);
  });
});

test("valid image bytes remain storable, hashed, readable, and physically persisted", async () => {
  await withVault(async ({ mediaRoot, store, vault }) => {
    const treasure = vault.createTreasure(collector, {
      title: "Real Image Treasure",
      category: "Film & Movie Memorabilia"
    });
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x01, 0x02, 0x03, 0x04]);
    const media = await vault.addImage(collector, treasure.id, {
      contentType: "image/jpeg; charset=binary",
      originalName: "actual-item.jpg",
      bytes: jpeg
    });

    assert.match(media.sha256, /^[a-f0-9]{64}$/);
    assert.equal(media.contentType, "image/jpeg");
    assert.equal(store.listMediaForTreasure(collector.id, treasure.id).length, 1);

    const persisted = store.getMedia(collector.id, media.id);
    assert.ok(persisted);
    assert.equal(await exists(join(mediaRoot, persisted.storagePath)), true);

    const retrieved = await vault.media(collector, media.id);
    assert.deepEqual(retrieved.bytes, jpeg);
  });
});
