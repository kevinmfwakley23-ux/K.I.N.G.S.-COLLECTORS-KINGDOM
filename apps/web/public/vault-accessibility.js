const DIALOG_LABELS = Object.freeze([
  ["treasure-dialog", "#treasure-form-title", "vault-treasure-dialog-title"],
  ["detail-dialog", "#detail-title", "vault-detail-dialog-title"],
  ["folder-dialog", ".dialog-head h2", "vault-folder-dialog-title"],
  ["location-dialog", ".dialog-head h2", "vault-location-dialog-title"],
  ["duplicates-dialog", ".dialog-head h2", "vault-duplicates-dialog-title"]
]);

function nameDialog(dialogId, headingSelector, fallbackHeadingId) {
  const dialog = document.getElementById(dialogId);
  if (!dialog) return false;
  const heading = dialog.querySelector(headingSelector);
  if (!heading) return false;
  if (!heading.id) heading.id = fallbackHeadingId;
  dialog.setAttribute("aria-labelledby", heading.id);
  return true;
}

function installDialogNames() {
  for (const [dialogId, headingSelector, fallbackHeadingId] of DIALOG_LABELS) {
    nameDialog(dialogId, headingSelector, fallbackHeadingId);
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
  installDialogNames();
  installCollectionBusyState();
  installFileInputDescription();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
else install();

export { DIALOG_LABELS, nameDialog };
