const DIALOG_LABELS = Object.freeze([
  ["treasure-dialog", "#treasure-form-title", "vault-treasure-dialog-title"],
  ["detail-dialog", "#detail-title", "vault-detail-dialog-title"],
  ["folder-dialog", ".dialog-head h2", "vault-folder-dialog-title"],
  ["location-dialog", ".dialog-head h2", "vault-location-dialog-title"],
  ["duplicates-dialog", ".dialog-head h2", "vault-duplicates-dialog-title"]
]);

const DIALOG_FOCUS_TARGETS = Object.freeze({
  "treasure-dialog": "#treasure-title",
  "detail-dialog": "#detail-title",
  "folder-dialog": "#folder-name",
  "location-dialog": "#location-name",
  "duplicates-dialog": ".dialog-head h2"
});

const dialogInvokers = new WeakMap();

function nameDialog(dialogId, headingSelector, fallbackHeadingId) {
  const dialog = document.getElementById(dialogId);
  if (!dialog) return false;
  const heading = dialog.querySelector(headingSelector);
  if (!heading) return false;
  if (!heading.id) heading.id = fallbackHeadingId;
  dialog.setAttribute("aria-labelledby", heading.id);
  return true;
}

function focusTarget(dialog) {
  const selector = DIALOG_FOCUS_TARGETS[dialog.id];
  if (!selector) return null;
  const target = dialog.querySelector(selector);
  if (!(target instanceof HTMLElement)) return null;
  if (/^H[1-6]$/.test(target.tagName) && !target.hasAttribute("tabindex")) target.tabIndex = -1;
  return target;
}

function rememberDialogInvoker(dialog) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body || dialog.contains(active)) return;
  dialogInvokers.set(dialog, active);
}

function restoreDialogInvoker(dialog) {
  const invoker = dialogInvokers.get(dialog);
  dialogInvokers.delete(dialog);
  if (!(invoker instanceof HTMLElement) || !invoker.isConnected) return;
  invoker.focus({ preventScroll: true });
}

function installDialogFocus(dialog) {
  dialog.addEventListener("beforetoggle", (event) => {
    if (event.newState !== "open") return;
    rememberDialogInvoker(dialog);
    setTimeout(() => {
      if (!dialog.open) return;
      focusTarget(dialog)?.focus({ preventScroll: true });
    }, 0);
  });
  dialog.addEventListener("close", () => restoreDialogInvoker(dialog));
}

function installDialogs() {
  for (const [dialogId, headingSelector, fallbackHeadingId] of DIALOG_LABELS) {
    nameDialog(dialogId, headingSelector, fallbackHeadingId);
    const dialog = document.getElementById(dialogId);
    if (dialog instanceof HTMLDialogElement) installDialogFocus(dialog);
  }
}

function installCollectionBusyState() {
  const collection = document.querySelector(".vault-collection");
  const loading = document.querySelector("#vault-loading");
  if (!collection || !loading) return;

  const sync = () => collection.setAttribute("aria-busy", loading.hidden ? "false" : "true");
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(loading, { attributes: true, attributeFilter: ["hidden"] });
}

function installFileInputDescription() {
  const input = document.querySelector("#treasure-image-input");
  const status = document.querySelector("#detail-status");
  if (!input || !status) return;
  if (!status.id) status.id = "detail-status";
  input.setAttribute("aria-describedby", status.id);
}

function install() {
  installDialogs();
  installCollectionBusyState();
  installFileInputDescription();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
else install();

export { DIALOG_FOCUS_TARGETS, DIALOG_LABELS, focusTarget, nameDialog, rememberDialogInvoker, restoreDialogInvoker };
