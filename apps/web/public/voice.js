const ROOM_ROUTES = Object.freeze({
  "great hall": "/great-hall.html",
  home: "/great-hall.html",
  vault: "/vault.html",
  "royal vault": "/vault.html",
  marketplace: "/room.html?room=marketplace",
  market: "/room.html?room=marketplace",
  "street market": "/room.html?room=marketplace",
  library: "/room.html?room=library",
  observatory: "/room.html?room=observatory",
  "war room": "/room.html?room=war-room",
  treasury: "/room.html?room=treasury",
  workshop: "/room.html?room=workshop",
  "artisan workshop": "/room.html?room=workshop",
  "hall of legacy": "/room.html?room=hall-of-legacy",
  "royal chambers": "/room.html?room=royal-chambers"
});

function normalizePhrase(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[.!?;,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseKingdomVoiceCommand(rawTranscript) {
  const transcript = String(rawTranscript ?? "").trim();
  const normalized = normalizePhrase(transcript);
  if (!normalized) return Object.freeze({ action: "empty", transcript });

  if (/^(?:call|open|show|summon) (?:the )?keeper$/.test(normalized)) {
    return Object.freeze({ action: "keeper-open", transcript });
  }
  if (/^(?:close|dismiss|hide) (?:the )?keeper$/.test(normalized)) {
    return Object.freeze({ action: "keeper-close", transcript });
  }

  const keeperQuestion = normalized.match(/^(?:ask|tell) (?:the )?keeper(?: to)?\s+(.+)$/);
  if (keeperQuestion) {
    const content = transcript.replace(/^(?:ask|tell) (?:the )?keeper(?: to)?\s+/i, "").trim();
    return Object.freeze({ action: "keeper-message", transcript, content });
  }

  const navigation = normalized.match(/^(?:open|enter|visit|go to|take me to|walk to|return to) (?:the )?(.+)$/);
  if (navigation) {
    const destination = navigation[1].replace(/^kingdom /, "").trim();
    const href = ROOM_ROUTES[destination];
    if (href) return Object.freeze({ action: "navigate", transcript, destination, href });
  }

  if (/^(?:add|create|new) (?:a |another )?treasure$/.test(normalized)) {
    return Object.freeze({ action: "add-treasure", transcript });
  }

  const search = normalized.match(/^(?:search(?: the (?:kingdom|vault))?(?: for)?|find|find me|look for|look up)\s+(.+)$/);
  if (search) {
    const query = transcript.replace(/^(?:search(?: the (?:kingdom|vault))?(?: for)?|find|find me|look for|look up)\s+/i, "").trim();
    return Object.freeze({ action: "search", transcript, query });
  }

  if (/^(?:voice help|what can i say|voice commands)$/.test(normalized)) {
    return Object.freeze({ action: "help", transcript });
  }

  return Object.freeze({ action: "unrecognized", transcript });
}

export function insertVoiceTranscript(target, transcript) {
  if (!target || typeof target.value !== "string") throw new TypeError("Voice dictation requires a text-capable form field.");
  const text = String(transcript ?? "").trim();
  if (!text) return target.value;

  const start = Number.isInteger(target.selectionStart) ? target.selectionStart : target.value.length;
  const end = Number.isInteger(target.selectionEnd) ? target.selectionEnd : start;
  const before = target.value.slice(0, start);
  const after = target.value.slice(end);
  const prefix = before && !/\s$/.test(before) ? " " : "";
  const suffix = after && !/^\s/.test(after) ? " " : "";
  target.value = `${before}${prefix}${text}${suffix}${after}`;
  const caret = before.length + prefix.length + text.length + suffix.length;
  if (typeof target.setSelectionRange === "function") target.setSelectionRange(caret, caret);
  target.dispatchEvent?.(new Event("input", { bubbles: true }));
  return target.value;
}

function speechRecognitionConstructor() {
  return globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition ?? null;
}

async function createRecognition() {
  const Recognition = speechRecognitionConstructor();
  if (!Recognition) return null;
  const recognition = new Recognition();
  recognition.lang = navigator.language || "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  if ("processLocally" in recognition && typeof Recognition.available === "function") {
    try {
      const availability = await Recognition.available({ langs: [recognition.lang], processLocally: true });
      if (availability === "available") recognition.processLocally = true;
    } catch {}
  }
  return recognition;
}

function friendlySpeechError(code) {
  const messages = {
    "not-allowed": "Microphone permission was not granted.",
    "service-not-allowed": "Speech recognition is blocked by this browser or device policy.",
    "audio-capture": "No usable microphone was found.",
    "no-speech": "I did not hear speech. Try again when you are ready.",
    network: "The browser's speech recognition service could not be reached.",
    aborted: "Voice listening stopped."
  };
  return messages[code] ?? "Voice recognition could not complete that request.";
}

async function listenOnce({ onListening } = {}) {
  const recognition = await createRecognition();
  if (!recognition) throw new Error("Voice recognition is not supported by this browser. Typed controls remain available.");

  return new Promise((resolve, reject) => {
    let settled = false;
    recognition.addEventListener("start", () => onListening?.(true));
    recognition.addEventListener("end", () => onListening?.(false));
    recognition.addEventListener("result", (event) => {
      if (settled) return;
      settled = true;
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? "";
      resolve(transcript);
    });
    recognition.addEventListener("error", (event) => {
      if (settled) return;
      settled = true;
      reject(new Error(friendlySpeechError(event.error)));
    });
    try {
      recognition.start();
    } catch (error) {
      reject(error);
    }
  });
}

function defaultHelpText() {
  return "Try: “open the Vault,” “call the Keeper,” “ask the Keeper what should I catalog next,” “search for Charizard,” or “add a treasure.” Use a microphone button beside a field for dictation.";
}

export function createVoiceController({
  keeper = null,
  onSearch = null,
  onAddTreasure = null,
  commandButtonSelector = "[data-voice-command]",
  statusSelector = "#voice-status"
} = {}) {
  const commandButtons = [...document.querySelectorAll(commandButtonSelector)];
  const status = document.querySelector(statusSelector);
  const Recognition = speechRecognitionConstructor();

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  async function execute(command) {
    switch (command.action) {
      case "navigate":
        setStatus(`Opening ${command.destination}…`);
        window.location.assign(command.href);
        return;
      case "keeper-open":
        keeper?.open();
        setStatus("The Keeper is at your service.");
        return;
      case "keeper-close":
        keeper?.close();
        setStatus("The Keeper panel is closed.");
        return;
      case "keeper-message":
        if (!keeper) throw new Error("The Keeper is not available on this page.");
        setStatus("Sending your spoken question to The Keeper…");
        await keeper.send(command.content);
        setStatus("The Keeper answered your spoken question.");
        return;
      case "search":
        if (!onSearch) throw new Error("Voice search is not available in this location yet.");
        await onSearch(command.query);
        setStatus(`Searching for “${command.query}”.`);
        return;
      case "add-treasure":
        if (!onAddTreasure) throw new Error("Treasure entry is available inside the Royal Vault.");
        onAddTreasure();
        setStatus("Opening a new treasure record.");
        return;
      case "help":
        setStatus(defaultHelpText());
        return;
      case "unrecognized":
        setStatus(`I heard “${command.transcript},” but did not match it to a safe Kingdom command. ${defaultHelpText()}`);
        return;
      default:
        setStatus("I did not hear a command.");
    }
  }

  async function startCommand() {
    setStatus("Listening for a Kingdom command…");
    try {
      const transcript = await listenOnce({
        onListening: (active) => commandButtons.forEach((button) => button.classList.toggle("voice-listening", active))
      });
      await execute(parseKingdomVoiceCommand(transcript));
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function startDictation(button) {
    const selector = button.dataset.voiceTarget;
    const target = selector ? document.querySelector(selector) : null;
    if (!target) {
      setStatus("The selected dictation field is unavailable.");
      return;
    }
    setStatus(`Listening for dictation into ${target.getAttribute("aria-label") || target.labels?.[0]?.textContent?.trim() || "this field"}…`);
    try {
      const transcript = await listenOnce({ onListening: (active) => button.classList.toggle("voice-listening", active) });
      insertVoiceTranscript(target, transcript);
      target.focus();
      setStatus(transcript ? "Dictation added. Review it before submitting." : "No speech was captured.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  for (const button of commandButtons) {
    if (!Recognition) {
      button.hidden = true;
      continue;
    }
    button.addEventListener("click", startCommand);
  }

  document.querySelectorAll("[data-voice-target]").forEach((button) => {
    if (!Recognition) {
      button.hidden = true;
      return;
    }
    button.addEventListener("click", () => startDictation(button));
  });

  if (!Recognition) setStatus("Voice recognition is not supported by this browser. All typed controls remain available.");

  return Object.freeze({
    supported: Boolean(Recognition),
    startCommand,
    execute,
    parse: parseKingdomVoiceCommand
  });
}

if (typeof document !== "undefined" && document.querySelector("#import-preview-form")) {
  import("./vault-import-ui.js").catch((error) => {
    const status = document.querySelector("#import-preview-result");
    if (status) status.textContent = `The Vault import review interface could not load: ${error.message}`;
  });

  import("./vault-intake-ui.js")
    .then(() => import("./vault-scanner-ui.js"))
    .then(({ createVaultScannerUi }) => createVaultScannerUi())
    .catch((error) => {
      const status = document.querySelector("#vault-status");
      if (status) status.textContent = `The Royal Intake Queue or barcode scanner interface could not load: ${error.message}`;
    });

  import("./vault-provenance-ui.js").catch((error) => {
    const status = document.querySelector("#treasure-status");
    if (status) status.textContent = `The provenance ledger interface could not load: ${error.message}`;
  });
}
