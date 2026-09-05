import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BULK_DESTINATION_CLEAR,
  BULK_DESTINATION_UNCHANGED,
  MAX_BULK_REORGANIZATION_SELECTION,
  bulkDestinationFromChoices,
  createBulkIdempotencyKey,
  organizationSummary,
  previewRowSummary,
  selectionStatus
} from "../apps/web/public/vault-bulk-reorganization-core.js";

const uiSource = await readFile(new URL("../apps/web/public/vault-bulk-reorganization-ui.js", import.meta.url), "utf8");

test("bulk destination choices distinguish unchanged, explicit clear, and saved destinations", () => {
  assert.deepEqual(
    bulkDestinationFromChoices("id:collection-1", BULK_DESTINATION_UNCHANGED),
    { collectionId: "collection-1" }
  );
  assert.deepEqual(
    bulkDestinationFromChoices(BULK_DESTINATION_CLEAR, "id:location-1"),
    { collectionId: null, locationId: "location-1" }
  );
  assert.deepEqual(
    bulkDestinationFromChoices(BULK_DESTINATION_UNCHANGED, BULK_DESTINATION_CLEAR),
    { locationId: null }
  );
  assert.throws(
    () => bulkDestinationFromChoices(BULK_DESTINATION_UNCHANGED, BULK_DESTINATION_UNCHANGED),
    /Choose a destination collection/
  );
  assert.throws(() => bulkDestinationFromChoices("collection-1", BULK_DESTINATION_UNCHANGED), /choice is invalid/);
});

test("bulk browser selection enforces the same 100-treasure ceiling as the server workflow", () => {
  assert.equal(MAX_BULK_REORGANIZATION_SELECTION, 100);
  assert.deepEqual(selectionStatus(new Set()), { count: 0, valid: false, message: "Select at least one treasure." });
  assert.deepEqual(selectionStatus(new Set(["one"])), { count: 1, valid: true, message: "1 treasure selected." });
  assert.equal(selectionStatus(Array.from({ length: 100 }, (_, index) => `treasure-${index}`)).valid, true);
  const oversized = selectionStatus(Array.from({ length: 101 }, (_, index) => `treasure-${index}`));
  assert.equal(oversized.valid, false);
  assert.match(oversized.message, /no more than 100 treasures/);
});

test("bulk preview summaries show exact organization change without claiming mutation", () => {
  const row = {
    status: "ready",
    treasure: { id: "t-1", title: "Amazing Spider-Man #300" },
    before: {
      collection: { id: "c-1", name: "Comics" },
      location: { id: "l-1", name: "Shelf", path: "Vault Room → Shelf" }
    },
    after: {
      collection: { id: "c-2", name: "Key Issues" },
      location: { id: "l-2", name: "Safe", path: "Display Room → Safe" }
    },
    changedFields: ["collectionId", "locationId"]
  };
  assert.equal(organizationSummary(row.before), "Comics • Vault Room → Shelf");
  assert.deepEqual(previewRowSummary(row), {
    title: "Amazing Spider-Man #300",
    before: "Comics • Vault Room → Shelf",
    after: "Key Issues • Display Room → Safe",
    changed: "collectionId + locationId",
    error: null
  });

  const invalid = previewRowSummary({ status: "error", error: { message: "Treasure unavailable." } });
  assert.equal(invalid.title, "Unavailable treasure");
  assert.equal(invalid.error, "Treasure unavailable.");
});

test("bulk UI creates a unique safe idempotency key per reviewed preview", () => {
  assert.equal(createBulkIdempotencyKey(() => "123e4567-e89b-42d3-a456-426614174000"), "bulk-ui:123e4567-e89b-42d3-a456-426614174000");
  assert.throws(() => createBulkIdempotencyKey(() => ""), /UUID generator/);
});

test("bulk UI is wired to preview then idempotent commit and exposes no destructive mass action", () => {
  assert.match(uiSource, /\/api\/vault\/reorganization\/bulk\/preview/);
  assert.match(uiSource, /Idempotency-Key/);
  assert.match(uiSource, /Confirm and move/);
  assert.match(uiSource, /Nothing has moved yet/);
  assert.match(uiSource, /does not archive or delete treasures/);
  assert.doesNotMatch(uiSource, /method:\s*["']DELETE["']/);
});
