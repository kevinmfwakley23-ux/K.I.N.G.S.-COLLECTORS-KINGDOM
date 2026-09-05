import {
  normalizeBarcodeDetection,
  preferredBarcodeFormats,
  scannerEnvironmentSupport,
  scannerSupportMessage,
  shouldAcceptBarcodeDetection
} from "./vault-scanner-core.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function ensureStylesheet() {
  if (document.querySelector('link[href="/vault-scanner.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-scanner.css";
  document.head.append(link);
}

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
  if (!response.ok) throw new Error(body.message ?? "The Royal scanner could not save that capture.");
  return body;
}

function cameraErrorMessage(error) {
  const name = error?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera permission was not granted. Manual intake remains available.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No suitable camera was found. Manual intake remains available.";
  if (name === "NotReadableError") return "The camera is already in use or unavailable to this browser.";
  return error?.message || "The camera scanner could not start. Manual intake remains available.";
}

export async function createVaultScannerUi() {
  const panel = document.querySelector("#royal-intake-panel");
  const toolbar = panel?.querySelector(".intake-toolbar");
  const cameraNote = panel?.querySelector(".intake-camera-note");
  if (!panel || !toolbar || !cameraNote || document.querySelector("#vault-camera-scanner")) return null;

  ensureStylesheet();

  const support = scannerEnvironmentSupport({
    secureContext: globalThis.isSecureContext === true,
    hasMediaDevices: Boolean(navigator.mediaDevices?.getUserMedia),
    hasBarcodeDetector: typeof globalThis.BarcodeDetector === "function"
  });

  if (!support.supported) {
    cameraNote.textContent = scannerSupportMessage(support.reason);
    cameraNote.dataset.scannerSupport = "unavailable";
    return Object.freeze({ supported: false, reason: support.reason });
  }

  let supportedFormats = [];
  try {
    const formats = typeof globalThis.BarcodeDetector.getSupportedFormats === "function"
      ? await globalThis.BarcodeDetector.getSupportedFormats()
      : [];
    supportedFormats = preferredBarcodeFormats(formats);
  } catch {
    supportedFormats = [];
  }

  if (!supportedFormats.length) {
    cameraNote.textContent = "This browser exposes barcode detection but no supported retail/collector barcode formats were reported. Manual intake remains available.";
    cameraNote.dataset.scannerSupport = "unavailable";
    return Object.freeze({ supported: false, reason: "no-supported-formats" });
  }

  cameraNote.textContent = `Camera scanning is available on this device for ${supportedFormats.length} supported barcode format${supportedFormats.length === 1 ? "" : "s"}. It starts only when you press the scanner button and stops when you close it.`;
  cameraNote.dataset.scannerSupport = "available";

  const startButton = node("button", "gold-button intake-scan-button", "Start camera scanner");
  startButton.type = "button";
  toolbar.prepend(startButton);

  const shell = node("section", "vault-camera-scanner");
  shell.id = "vault-camera-scanner";
  shell.hidden = true;
  shell.setAttribute("aria-labelledby", "vault-camera-scanner-title");

  const heading = node("div", "scanner-heading");
  const headingCopy = node("div", "");
  headingCopy.append(
    node("p", "eyebrow", "Royal Scanner"),
    node("h3", "", "Scan into the Intake Queue"),
    node("p", "muted-copy", "A detection is saved as identifier evidence only. It will not create a treasure or claim an exact catalog match.")
  );
  headingCopy.querySelector("h3").id = "vault-camera-scanner-title";
  const stopButton = node("button", "quiet-button", "Stop camera");
  stopButton.type = "button";
  heading.append(headingCopy, stopButton);
  shell.append(heading);

  const stage = node("div", "scanner-stage");
  const video = document.createElement("video");
  video.className = "scanner-video";
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("aria-label", "Live camera view for barcode scanning");
  const guide = node("div", "scanner-guide");
  guide.setAttribute("aria-hidden", "true");
  stage.append(video, guide);
  shell.append(stage);

  const scannerStatus = node("p", "scanner-status", "Camera is stopped.");
  scannerStatus.setAttribute("role", "status");
  scannerStatus.setAttribute("aria-live", "polite");
  shell.append(scannerStatus);
  cameraNote.after(shell);

  let stream = null;
  let detector = null;
  let active = false;
  let timer = null;
  let scanning = false;
  let lastValue = null;
  let lastAcceptedAt = 0;

  function clearTimer() {
    if (timer !== null) {
      globalThis.clearTimeout(timer);
      timer = null;
    }
  }

  function stopCamera({ message = "Camera stopped." } = {}) {
    active = false;
    clearTimer();
    scanning = false;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    }
    video.srcObject = null;
    shell.hidden = true;
    startButton.disabled = false;
    startButton.textContent = "Start camera scanner";
    scannerStatus.textContent = message;
  }

  async function saveDetection(detection) {
    const result = await api("/api/vault/intake", {
      method: "POST",
      body: JSON.stringify({
        sourceType: "camera",
        identifierType: detection.identifierType,
        identifierValue: detection.rawValue,
        barcodeFormat: detection.format,
        captureCount: 1
      })
    });
    scannerStatus.textContent = result.merged
      ? `Scanned ${detection.rawValue}. Existing pending capture count is now ${result.item.captureCount}.`
      : `Scanned ${detection.rawValue}. Added to your Royal Intake Queue.`;
    globalThis.dispatchEvent(new Event("kings:vault-intake-change"));
  }

  async function scanFrame() {
    if (!active || !detector || scanning) return;
    scanning = true;
    try {
      if (video.readyState >= 2) {
        const detections = await detector.detect(video);
        for (const candidate of detections ?? []) {
          const detection = normalizeBarcodeDetection(candidate);
          if (!detection) continue;
          const now = Date.now();
          const accepted = shouldAcceptBarcodeDetection({
            lastValue,
            lastAcceptedAt,
            value: detection.rawValue,
            now,
            debounceMs: 1500
          });
          if (!accepted) continue;
          lastValue = detection.rawValue;
          lastAcceptedAt = now;
          await saveDetection(detection);
          break;
        }
      }
    } catch (error) {
      scannerStatus.textContent = `Scanner read error: ${error.message}. Camera remains open; manual intake is also available.`;
    } finally {
      scanning = false;
      if (active) timer = globalThis.setTimeout(scanFrame, 280);
    }
  }

  async function startCamera() {
    if (active) return;
    startButton.disabled = true;
    scannerStatus.textContent = "Requesting camera access…";
    try {
      detector = new globalThis.BarcodeDetector({ formats: supportedFormats });
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      video.srcObject = stream;
      await video.play();
      active = true;
      lastValue = null;
      lastAcceptedAt = 0;
      shell.hidden = false;
      startButton.textContent = "Scanner running";
      scannerStatus.textContent = "Camera is live. Hold one barcode inside the guide. Scans are saved to your Intake Queue.";
      scanFrame();
      shell.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      stopCamera({ message: cameraErrorMessage(error) });
      cameraNote.textContent = cameraErrorMessage(error);
    }
  }

  startButton.addEventListener("click", startCamera);
  stopButton.addEventListener("click", () => stopCamera());
  globalThis.addEventListener("pagehide", () => stopCamera({ message: "Camera stopped because the page was left." }));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && active) stopCamera({ message: "Camera stopped when the Kingdom moved to the background." });
  });

  return Object.freeze({ supported: true, supportedFormats, startCamera, stopCamera });
}
