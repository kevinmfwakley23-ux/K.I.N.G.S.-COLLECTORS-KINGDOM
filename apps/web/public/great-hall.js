const hallTitle = document.querySelector("#hall-title");
const hallGreeting = document.querySelector("#hall-greeting");
const collectorChip = document.querySelector("#collector-chip");
const roomGrid = document.querySelector("#room-grid");
const activityList = document.querySelector("#activity-list");
const quickActions = document.querySelector("#quick-actions");
const announcement = document.querySelector("#announcement");
const collectionSummary = document.querySelector("#collection-summary");
const marketSummary = document.querySelector("#market-summary");
const notificationSummary = document.querySelector("#notification-summary");
const searchForm = document.querySelector("#kingdom-search-form");
const searchInput = document.querySelector("#kingdom-search");
const keeperPanel = document.querySelector("#keeper-panel");
const keeperBackdrop = document.querySelector("#keeper-backdrop");
const keeperClose = document.querySelector("#keeper-close");
const keeperForm = document.querySelector("#keeper-form");
const keeperInput = document.querySelector("#keeper-input");
const keeperMessages = document.querySelector("#keeper-messages");
const keeperStatus = document.querySelector("#keeper-status");
const signoutButton = document.querySelector("#signout-button");

const conversation = [];

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
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function renderRooms(rooms) {
  roomGrid.replaceChildren();
  for (const room of rooms) {
    const link = element("a", `room-card ${room.status === "available" ? "available" : "planned"}`);
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
      element("span", "room-enter", room.status === "available" ? "Enter room →" : "View entrance →")
    );
    roomGrid.append(link);
  }
}

function renderActivity(items) {
  activityList.replaceChildren();
  if (!items.length) {
    const item = element("li", "activity-empty", "No verified account activity is available yet.");
    activityList.append(item);
    return;
  }

  for (const activity of items) {
    const item = element("li", "activity-item");
    const marker = element("span", "activity-marker");
    marker.setAttribute("aria-hidden", "true");
    const copy = element("div", "activity-copy");
    copy.append(
      element("strong", "", activity.message),
      element("time", "", formatTime(activity.createdAt))
    );
    item.append(marker, copy);
    activityList.append(item);
  }
}

function handleAction(action) {
  if (action === "keeper") {
    openKeeper();
    keeperInput.focus();
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

function openKeeper() {
  keeperPanel.hidden = false;
  keeperBackdrop.hidden = false;
  document.body.classList.add("keeper-open");
}

function closeKeeper() {
  keeperPanel.hidden = true;
  keeperBackdrop.hidden = true;
  document.body.classList.remove("keeper-open");
}

function appendKeeperMessage(role, content) {
  const message = element("p", `keeper-message ${role}`, content);
  keeperMessages.append(message);
  keeperMessages.scrollTop = keeperMessages.scrollHeight;
}

async function sendKeeperMessage(rawMessage) {
  const message = rawMessage.trim();
  if (!message) return;
  openKeeper();
  const history = conversation.slice(-8);
  conversation.push({ role: "user", content: message });
  appendKeeperMessage("user", message);
  keeperStatus.textContent = "The Keeper is consulting K.I.N.G.S. AI…";
  keeperInput.disabled = true;

  try {
    const result = await api("/api/keeper/chat", {
      method: "POST",
      body: JSON.stringify({ message, history })
    });
    conversation.push({ role: "assistant", content: result.reply });
    appendKeeperMessage("assistant", result.reply);
    keeperStatus.textContent = result.modelId ? `Answered through K.I.N.G.S. AI • ${result.modelId}` : "Answered through K.I.N.G.S. AI.";
  } catch (error) {
    appendKeeperMessage("system", error.message);
    keeperStatus.textContent = "The Keeper's intelligence route is currently unavailable.";
  } finally {
    keeperInput.disabled = false;
    keeperInput.focus();
  }
}

async function loadGreatHall() {
  const hall = await api("/api/great-hall");
  hallTitle.textContent = hall.greeting;
  hallGreeting.textContent = "Your Great Hall is ready. Nothing below is invented: unavailable Kingdom services are labeled until their real backend exists.";
  collectorChip.textContent = `${hall.collector.displayName} • ${hall.collector.roles.join(", ") || "collector"}`;
  collectionSummary.textContent = hall.collectionOverview.message;
  marketSummary.textContent = hall.marketplaceHighlights.message;
  notificationSummary.textContent = hall.notifications.message;
  renderRooms(hall.navigation);
  renderActivity(hall.recentActivity);
  renderQuickActions(hall.quickActions);
  announcement.replaceChildren(
    element("strong", "", hall.announcement.title),
    element("p", "", hall.announcement.message)
  );
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;
  searchInput.value = "";
  await sendKeeperMessage(`Search the Kingdom for: ${query}`);
});

keeperForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = keeperInput.value;
  keeperInput.value = "";
  await sendKeeperMessage(message);
});

keeperClose.addEventListener("click", closeKeeper);
keeperBackdrop.addEventListener("click", closeKeeper);

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
