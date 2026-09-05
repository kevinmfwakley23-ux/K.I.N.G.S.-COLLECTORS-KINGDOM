import test from "node:test";
import assert from "node:assert/strict";
import { createGreatHallService } from "../packages/great-hall/src/service.mjs";

const identity = Object.freeze({
  id: "collector-1",
  displayName: "Collector",
  roles: ["collector"],
  emailVerified: true
});

const identityService = Object.freeze({
  listRecentActivity() {
    return [
      { eventType: "identity.sign_in_succeeded", createdAt: "2026-09-04T12:00:00.000Z" }
    ];
  }
});

function systemMessage(routeRequest) {
  return routeRequest.messages.find((message) => message.role === "system")?.content ?? "";
}

test("Kingdom navigation encodes castle interiors separately from outdoor grounds", () => {
  const service = createGreatHallService({ identityService });
  const rooms = service.navigation(identity);

  const vault = rooms.find((room) => room.id === "vault");
  assert.equal(vault.zone, "castle");
  assert.equal(vault.environment, "secure-treasure-vault");
  assert.match(vault.description, /secure treasure-vault/i);

  const marketplace = rooms.find((room) => room.id === "marketplace");
  assert.equal(marketplace.zone, "grounds");
  assert.equal(marketplace.environment, "street-market");
  assert.match(marketplace.role, /Street Market/);
  assert.match(marketplace.description, /Beyond the castle gates/i);

  assert.ok(rooms.filter((room) => room.zone === "castle").length > rooms.filter((room) => room.zone === "grounds").length);
});

test("The Keeper is a continuous room-aware royal attendant rather than a detached chatbot", () => {
  const service = createGreatHallService({ identityService });

  const greatHall = service.keeperRouteRequest(identity, { message: "Where am I?", roomId: "great-hall" });
  const hallSystem = systemMessage(greatHall);
  assert.match(hallSystem, /resident royal assistant, butler, servant, advisor, steward, curator, and guide/i);
  assert.match(hallSystem, /upright anthropomorphic lion/i);
  assert.match(hallSystem, /physically present with the collector/i);
  assert.match(hallSystem, /Current room: Great Hall, inside the castle/i);

  const vault = service.keeperRouteRequest(identity, { message: "Help me here.", roomId: "vault" });
  assert.match(systemMessage(vault), /Current room: Vault, inside the castle/i);

  const market = service.keeperRouteRequest(identity, { message: "Help me compare where I am.", roomId: "marketplace" });
  assert.match(systemMessage(market), /outside the castle in the Kingdom Street Market grounds/i);
});

test("Keeper context preserves collector authority, uncertainty, and no-fake-data rules", () => {
  const service = createGreatHallService({ identityService });
  const request = service.keeperRouteRequest(identity, { message: "What is my collection worth?", roomId: "vault" });
  const system = systemMessage(request);

  assert.match(system, /Never invent collection records, values, marketplace facts/i);
  assert.match(system, /prefer verification over confident guessing/i);
  assert.match(system, /collector controls permanent memories and cost\/quality routing choices/i);
  assert.equal(request.allowToolProposals, false);
});

test("unknown Keeper room context fails instead of inventing a location", () => {
  const service = createGreatHallService({ identityService });
  assert.throws(
    () => service.keeperRouteRequest(identity, { message: "Where am I?", roomId: "imaginary-tower" }),
    /not recognized/i
  );
});
