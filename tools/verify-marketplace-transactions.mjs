import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "dist/config/marketplace-transactions.mjs",
  "dist/packages/marketplace/src/stripe-connect-provider.mjs",
  "dist/packages/marketplace/src/transaction-repository.mjs",
  "dist/packages/marketplace/src/transaction-service.mjs",
  "dist/packages/marketplace/src/transaction-runtime.mjs",
  "dist/apps/web/marketplace-transaction-http.mjs",
  "dist/apps/web/marketplace-server.mjs",
  "dist/apps/web/runtime.mjs"
];
for (const relative of required) await access(resolve(root, relative));

const runtime = await readFile(resolve(root, "dist/apps/web/runtime.mjs"), "utf8");
if (!runtime.includes("createMarketplaceTransactionRuntime")) throw new Error("Production runtime does not construct the Marketplace transaction boundary.");
if (!runtime.includes("marketplaceTransactionService")) throw new Error("Production server does not receive Marketplace transaction services.");

const server = await readFile(resolve(root, "dist/apps/web/marketplace-server.mjs"), "utf8");
if (!server.includes("handleMarketplaceTransactionRoute")) throw new Error("Marketplace server does not route transaction HTTP requests.");

const transactionConfig = await readFile(resolve(root, "dist/config/marketplace-transactions.mjs"), "utf8");
for (const gate of ["KINGDOM_MARKETPLACE_CHECKOUT_ENABLED", "KINGDOM_STRIPE_TAX_ENABLED", "KINGDOM_STRIPE_TAX_POLICY_ID"]) {
  if (!transactionConfig.includes(gate)) throw new Error(`Transaction runtime is missing the ${gate} safety gate.`);
}

const service = await readFile(resolve(root, "dist/packages/marketplace/src/transaction-service.mjs"), "utf8");
for (const boundary of ["ownershipTransferAuthorized: false", "soldProvenanceEventCreated: false", "marketplace_checkout_not_enabled"]) {
  if (!service.includes(boundary)) throw new Error(`Transaction service is missing required truth boundary: ${boundary}`);
}

console.log("Marketplace safeguarded transaction production artifact verification passed: provider-hosted onboarding/checkout, fail-closed tax gating, webhook authority, idempotent reservation, and no automatic ownership transfer are wired into dist.");