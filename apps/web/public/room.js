import { createKeeperController } from "./keeper.js";

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room") ?? "great-hall";
const roomTitle = document.querySelector("#room-title");
const roomRole = document.querySelector("#room-role");
const roomDescription = document.querySelector("#room-description");
const roomStatusPanel = document.querySelector("#room-status-panel");
const roomGrid = document.querySelector("#room-grid");
const roomHero = document.querySelector("#room-hero");
const locationVisual = document.querySelector("#location-visual");
const navigationEyebrow = document.querySelector("#navigation-eyebrow");
const keeperRole = document.querySelector("#keeper-role");
const keeperWelcomeMessage = document.querySelector("#keeper-welcome-message");

const keeper = createKeeperController({ roomId });

const KEEPER_ROLES = Object.freeze({
  "great-hall": "Royal Host",
  vault: "Royal Curator",
  library: "Royal Scholar",
  observatory: "Royal Watchman",
  "war-room": "Royal Strategist",
  treasury: "Royal Treasurer",
  workshop: "Royal Craftsman",
  marketplace: "Royal Trade Advisor",
  "hall-of-legacy": "Royal Historian",
  "royal-chambers": "Royal Steward"
});

async function api(path) {
  const response = await fetch(path, { credentials: "same-origin", headers: { Accept: "application/json" } });
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  if (!response.ok) throw new Error(body.message ?? "The Kingdom could not load this location.");
  return body;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderNavigation(rooms) {
  roomGrid.replaceChildren();
  for (const room of rooms) {
    const link = element("a", `room-card ${room.status === "available" ? "available" : "planned"} zone-${room.zone}`);
    link.href = room.href;
    link.append(
      element("span", "room-role", room.role),
      element("strong", "room-name", room.name),
      element("span", "room-status", room.status === "available" ? "Open" : "Construction")
    );
    roomGrid.append(link);
  }
}

function renderLocationVisual(room) {
  locationVisual.replaceChildren();
  roomHero.classList.add(`environment-${room.environment ?? "castle"}`);
  document.body.classList.add(`location-${room.id}`, `zone-${room.zone}`);

  if (room.id === "marketplace") {
    const image = document.createElement("img");
    image.src = "/assets/marketplace.svg";
    image.alt = "";
    image.className = "marketplace-entrance-art";
    locationVisual.append(image);
    return;
  }

  if (room.id === "vault") {
    const vault = element("div", "vault-door");
    const wheel = element("div", "vault-wheel");
    wheel.append(element("span", "vault-hub"));
    for (let index = 0; index < 6; index += 1) {
      const spoke = element("span", "vault-spoke");
      spoke.style.setProperty("--spoke", index);
      wheel.append(spoke);
    }
    vault.append(wheel, element("span", "vault-lock-label", "ROYAL VAULT"));
    locationVisual.append(vault);
    return;
  }

  const arch = element("div", "castle-arch");
  arch.append(element("span", "castle-arch-title", room.name));
  locationVisual.append(arch);
}

function locationConstructionCopy(room) {
  if (room.id === "marketplace") {
    return "The Kingdom Street Market is an outdoor Marketplace District beyond the castle gates. Real listings, merchant storefronts, offers, reputation, payments, shipping, and transaction history arrive only in the approved marketplace phases.";
  }
  return "This entrance is part of the permanent navigation system, but unfinished services are not simulated. The location gains real capabilities only in its approved implementation phase.";
}

async function loadRoom() {
  const { rooms } = await api("/api/navigation");
  const room = rooms.find((candidate) => candidate.id === roomId);
  if (!room) {
    roomTitle.textContent = "This Kingdom location does not exist.";
    roomDescription.textContent = "Return to the Great Hall and choose a recognized destination.";
    roomStatusPanel.textContent = "Unknown location.";
    renderNavigation(rooms);
    return;
  }

  if (room.status === "available" && typeof room.href === "string" && !room.href.startsWith("/room.html")) {
    window.location.replace(room.href);
    return;
  }

  keeper.setRoom(room.id);
  document.title = `${room.name} • K.I.N.G.S.`;
  roomRole.textContent = room.role;
  roomTitle.textContent = room.name;
  roomDescription.textContent = room.description;
  navigationEyebrow.textContent = room.zone === "grounds" ? "Castle & Grounds Navigation" : "Kingdom Navigation";
  keeperRole.textContent = KEEPER_ROLES[room.id] ?? "Royal Assistant";
  keeperWelcomeMessage.textContent = room.id === "marketplace"
    ? "I am beside you as Royal Trade Advisor. I can explain the Marketplace District and what will be available here, but I will never pressure you into a purchase."
    : `I am beside you here as ${KEEPER_ROLES[room.id] ?? "your royal assistant"}. Ask me about this location or where to go next.`;

  roomStatusPanel.replaceChildren(
    element("strong", "", room.zone === "grounds" ? "This Kingdom district is still under construction." : "This castle location is still under construction."),
    element("p", "", locationConstructionCopy(room))
  );
  renderLocationVisual(room);
  renderNavigation(rooms);
}

loadRoom().catch((error) => {
  roomTitle.textContent = "The location entrance is unavailable.";
  roomDescription.textContent = error.message;
});
