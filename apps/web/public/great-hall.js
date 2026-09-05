import { createKeeperController } from "./keeper.js";
import { createVoiceController } from "./voice.js";

const hallTitle = document.querySelector("#hall-title");
const hallGreeting = document.querySelector("#hall-greeting");
const collectorChip = document.querySelector("#collector-chip");
const castleRoomGrid = document.querySelector("#castle-room-grid");
const groundsGrid = document.querySelector("#grounds-grid");
const activityList = document.querySelector("#activity-list");
const quickActions = document.querySelector("#quick-actions");
const announcement = document.querySelector("#announcement");
const collectionSummary = document.querySelector("#collection-summary");
const marketSummary = document.querySelector("#market-summary");
const notificationSummary = document.querySelector("#notification-summary");
const searchForm = document.querySelector("#kingdom-search-form");
const searchInput = document.querySelector("#kingdom-search");
const signoutButton = document.querySelector("#signout-button");

const keeper = createKeeperController({ roomId: "great-hall" });

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {})
    }
  });
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
  if (!response.ok) throw new Error(body.message ?? "The Kingdom could not complete that request.");
  return body;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recorded recently";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function roomLink(room) {
  const classes = ["room-card", room.status === "available" ? "available" : "planned", `zone-${room.zone}`];
  if (room.environment) classes.push(`environment-${room.environment}`);
  const link = element("a", classes.join(" "));
  link.href = room.href;
  link.setAttribute("aria-label", `${room.name}, ${room.status === "available" ? "available" : "under construction"}`);

  const top = element("span", "room-card-top");
  top.append(
    element("span", "room-role", room.role),
    element("span", "room-status", room.status === "available" ? "Open" : "Construction")
  );
  link.append(
    top,
    element("strong", "room-name", room.name),
    element("span", "room-description", room.description),
    element("span", "room-enter", room.status === "available" ? "Enter →" : room.zone === "grounds" ? "Walk to entrance →" : "View entrance →")
  );
  return link;
}

function renderNavigation(rooms) {
  castleRoomGrid.replaceChildren();
  groundsGrid.replaceChildren();
  for (const room of rooms) {
    if (room.zone === "grounds") groundsGrid.append(roomLink(room));
    else castleRoomGrid.append(roomLink(room));
  }
}

function renderActivity(items) {
  activityList.replaceChildren();
  if (!items.length) {
    activityList.append(element("li", "activity-empty", "No verified account activity is available yet."));
    return;
  }

  for (const activity of items) {
    const item = element("li", "activity-item");
    const marker = element("span", "activity-marker");
    marker.setAttribute("aria-hidden", "true");
    const copy = element("div", "activity-copy");
    copy.append(element("strong", "", activity.message), element("time", "", formatTime(activity.createdAt)));
    item.append(marker, copy);
    activityList.append(item);
  }
}

function handleAction(action) {
  if (action === "keeper") {
    keeper.open();
  } else if (action === "search") {
    searchInput.focus();
  }
}

function renderQuickActions(actions) {
  quickActions.replaceChildren();
  for (const action of actions) {
    if (action.href) {
      const link = element("a", "quick-action", action.label);
      link.href = action.href;
      quickActions.append(link);
      continue;
    }
    const button = element("button", "quick-action", action.label);
    button.type = "button";
    button.addEventListener("click", () => handleAction(action.action));
    quickActions.append(button);
  }
}

async function loadGreatHall() {
  const hall = await api("/api/great-hall");
  hallTitle.textContent = hall.greeting;
  hallGreeting.textContent = "Your Great Hall is ready. Unavailable Kingdom services stay labeled until their real backend exists.";
  collectorChip.textContent = `${hall.collector.displayName} • ${hall.collector.roles.join(", ") || "collector"}`;
  collectionSummary.textContent = hall.collectionOverview.message;
  marketSummary.textContent = hall.marketplaceHighlights.message;
  notificationSummary.textContent = hall.notifications.message;
  renderNavigation(hall.navigation);
  renderActivity(hall.recentActivity);
  renderQuickActions(hall.quickActions);
  announcement.replaceChildren(element("strong", "", hall.announcement.title), element("p", "", hall.announcement.message));
}

async function runKingdomSearch(query) {
  const cleaned = String(query ?? "").trim();
  if (!cleaned) return;
  searchInput.value = cleaned;
  await keeper.send(`Search the Kingdom for: ${cleaned}`);
}

createVoiceController({
  keeper,
  onSearch: runKingdomSearch
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;
  searchInput.value = "";
  try {
    await keeper.send(`Search the Kingdom for: ${query}`);
  } catch {}
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => handleAction(button.dataset.action));
});

signoutButton.addEventListener("click", async () => {
  try {
    await api("/api/auth/sign-out", { method: "POST", body: "{}" });
  } finally {
    window.location.assign("/auth.html");
  }
});

loadGreatHall().catch((error) => {
  hallGreeting.textContent = error.message;
});
