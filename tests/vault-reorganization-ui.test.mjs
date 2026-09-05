import test from "node:test";
import assert from "node:assert/strict";
import {
  branchMoveNotice,
  collectionPatch,
  descendantLocationIds,
  eligibleLocationParents,
  hasChanges,
  locationPatch,
  locationTypes
} from "../apps/web/public/vault-reorganization-core.js";

const locations = [
  { id: "room-a", name: "Vault Room", path: "Vault Room", parentId: null, locationType: "room" },
  { id: "safe-a", name: "North Safe", path: "Vault Room → North Safe", parentId: "room-a", locationType: "safe" },
  { id: "shelf-a", name: "Shelf 2", path: "Vault Room → North Safe → Shelf 2", parentId: "safe-a", locationType: "shelf" },
  { id: "binder-a", name: "Pokémon Binder", path: "Vault Room → North Safe → Shelf 2 → Pokémon Binder", parentId: "shelf-a", locationType: "binder" },
  { id: "room-b", name: "Display Room", path: "Display Room", parentId: null, locationType: "room" }
];

test("location parent choices exclude the current branch while keeping safe destinations", () => {
  assert.deepEqual([...descendantLocationIds(locations, "safe-a")].sort(), ["binder-a", "shelf-a"]);
  const choices = eligibleLocationParents(locations, "safe-a");
  assert.deepEqual(choices.map((entry) => entry.id), ["room-b", "room-a"]);
  assert.equal(choices.some((entry) => entry.id === "safe-a"), false);
  assert.equal(choices.some((entry) => entry.id === "shelf-a"), false);
  assert.equal(choices.some((entry) => entry.id === "binder-a"), false);
});

test("collection patch sends only changed mutable fields", () => {
  const original = { id: "collection-1", name: "Pokémon", description: "Cards" };
  assert.deepEqual(collectionPatch(original, { name: "Pokémon", description: "Cards and sealed products" }), {
    description: "Cards and sealed products"
  });
  assert.equal(hasChanges(collectionPatch(original, { name: " Pokémon ", description: " Cards " })), false);
  assert.throws(() => collectionPatch(original, { name: "   ", description: "Cards" }), /name is required/i);
});

test("location patch handles branch moves and explicit top-level moves without rewriting IDs", () => {
  const original = locations[1];
  const move = locationPatch(original, {
    name: original.name,
    locationType: original.locationType,
    parentId: "room-b",
    notes: "Main graded-card safe"
  });
  assert.deepEqual(move, { parentId: "room-b", notes: "Main graded-card safe" });

  const topLevel = locationPatch({ ...original, notes: null }, {
    name: original.name,
    locationType: original.locationType,
    parentId: "",
    notes: ""
  });
  assert.deepEqual(topLevel, { parentId: null });
});

test("location helpers keep the controlled type vocabulary and explain branch identity preservation", () => {
  assert.ok(locationTypes().includes("binder"));
  assert.ok(locationTypes().includes("display-case"));
  assert.throws(
    () => locationPatch(locations[1], { name: "North Safe", locationType: "warehouse", parentId: "", notes: "" }),
    /supported location type/i
  );
  const notice = branchMoveNotice(locations[1], locations[4]);
  assert.match(notice, /Display Room/);
  assert.match(notice, /Descendant locations move with the branch/);
  assert.match(notice, /permanent treasure IDs stay unchanged/);
});
