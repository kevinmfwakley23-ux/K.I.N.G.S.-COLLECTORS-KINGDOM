import "./brand-runtime.js";

function keeperElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function keeperApi(path, options = {}) {
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
  if (!response.ok) throw new Error(body.message ?? "The Keeper could not complete that request.");
  return body;
}

function scheduleVaultEnhancements() {
  if (!document.body?.classList.contains("vault-page")) return;
  globalThis.setTimeout(async () => {
    try {
      const { loadVaultExtras } = await import("./vault-extras.js");
      await loadVaultExtras();
    } catch (error) {
      console.error("Vault enhancement bootstrap failed", error);
      const status = document.querySelector("#treasure-status");
      if (status) status.textContent = "Some advanced Vault tools could not load. Core Vault records remain available.";
    }
  }, 0);
}

export function createKeeperController({ roomId = "great-hall" } = {}) {
  const panel = document.querySelector("#keeper-panel");
  const backdrop = document.querySelector("#keeper-backdrop");
  const closeButton = document.querySelector("#keeper-close");
  const form = document.querySelector("#keeper-form");
  const input = document.querySelector("#keeper-input");
  const messages = document.querySelector("#keeper-messages");
  const status = document.querySelector("#keeper-status");

  if (!panel || !backdrop || !closeButton || !form || !input || !messages || !status) {
    throw new Error("The Keeper interface is incomplete on this page.");
  }

  const conversation = [];
  let currentRoomId = roomId;

  function setRoom(nextRoomId) {
    if (typeof nextRoomId === "string" && nextRoomId.trim()) currentRoomId = nextRoomId.trim();
  }

  function open({ focus = true } = {}) {
    panel.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add("keeper-open");
    if (focus) input.focus();
  }

  function close() {
    panel.hidden = true;
    backdrop.hidden = true;
    document.body.classList.remove("keeper-open");
  }

  function append(role, content) {
    const message = keeperElement("p", `keeper-message ${role}`, content);
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
  }

  async function send(rawMessage) {
    const message = String(rawMessage ?? "").trim();
    if (!message) return;
    open({ focus: false });
    const history = conversation.slice(-8);
    conversation.push({ role: "user", content: message });
    append("user", message);
    status.textContent = "The Keeper is consulting K.I.N.G.S. AI…";
    input.disabled = true;

    try {
      const result = await keeperApi("/api/keeper/chat", {
        method: "POST",
        body: JSON.stringify({ message, history, roomId: currentRoomId })
      });
      conversation.push({ role: "assistant", content: result.reply });
      append("assistant", result.reply);
      status.textContent = result.modelId ? `Answered through K.I.N.G.S. AI • ${result.modelId}` : "Answered through K.I.N.G.S. AI.";
      return result;
    } catch (error) {
      append("system", error.message);
      status.textContent = "The Keeper's intelligence route is currently unavailable.";
      throw error;
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  closeButton.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value;
    input.value = "";
    try {
      await send(message);
    } catch {}
  });

  document.querySelectorAll("[data-keeper-open]").forEach((trigger) => {
    trigger.addEventListener("click", () => open());
  });

  return Object.freeze({ open, close, send, setRoom });
}

scheduleVaultEnhancements();
window.KingdomKeeper = Object.freeze({ createKeeperController });
