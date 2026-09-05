const params = new URLSearchParams(window.location.search);
const roomId = params.get("room") ?? "great-hall";
const roomTitle = document.querySelector("#room-title");
const roomRole = document.querySelector("#room-role");
const roomDescription = document.querySelector("#room-description");
const roomStatusPanel = document.querySelector("#room-status-panel");
const roomGrid = document.querySelector("#room-grid");

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
  if (!response.ok) throw new Error(body.message ?? "The Kingdom could not load this room.");
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
    const link = element("a", `room-card ${room.status === "available" ? "available" : "planned"}`);
    link.href = room.href;
    link.append(
      element("span", "room-role", room.role),
      element("strong", "room-name", room.name),
      element("span", "room-status", room.status === "available" ? "Open" : "Construction")
    );
    roomGrid.append(link);
  }
}

async function loadRoom() {
  const { rooms } = await api("/api/navigation");
  const room = rooms.find((candidate) => candidate.id === roomId);
  if (!room) {
    roomTitle.textContent = "This Kingdom room does not exist.";
    roomDescription.textContent = "Return to the Great Hall and choose a recognized room entrance.";
    roomStatusPanel.textContent = "Unknown room.";
    renderNavigation(rooms);
    return;
  }

  if (room.id === "great-hall") {
    window.location.replace("/great-hall.html");
    return;
  }

  document.title = `${room.name} • K.I.N.G.S.`;
  roomRole.textContent = room.role;
  roomTitle.textContent = room.name;
  roomDescription.textContent = room.description;
  roomStatusPanel.replaceChildren(
    element("strong", "", "This room is still under construction."),
    element("p", "", "Its entrance is part of the permanent navigation system, but unfinished services are not simulated. The room will gain real capabilities only in its approved implementation phase.")
  );
  renderNavigation(rooms);
}

loadRoom().catch((error) => {
  roomTitle.textContent = "The room entrance is unavailable.";
  roomDescription.textContent = error.message;
});
