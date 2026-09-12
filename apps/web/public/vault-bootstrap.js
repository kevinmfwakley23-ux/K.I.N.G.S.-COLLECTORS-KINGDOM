import "./vault.js";
import { loadVaultExtras } from "./vault-extras.js";

function reportEnhancementFailure(error) {
  console.error("Vault enhancement bootstrap failed.", error);
  const main = document.querySelector("#vault-main");
  if (!main || document.querySelector("#vault-enhancement-bootstrap-error")) return;
  const message = document.createElement("p");
  message.id = "vault-enhancement-bootstrap-error";
  message.className = "vault-bootstrap-error";
  message.setAttribute("role", "status");
  message.textContent = "The core Royal Vault is available, but an advanced Vault enhancement failed to start. Reload the page before relying on valuation, grading, intake, or bulk-workflow controls.";
  main.prepend(message);
}

export async function bootstrapVaultEnhancements(load = loadVaultExtras) {
  if (typeof load !== "function") throw new TypeError("Vault enhancement bootstrap requires a loader function.");
  try {
    return await load();
  } catch (error) {
    reportEnhancementFailure(error);
    throw error;
  }
}

bootstrapVaultEnhancements().catch(() => {});
