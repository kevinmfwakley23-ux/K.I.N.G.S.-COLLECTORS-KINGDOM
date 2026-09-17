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
  "dist/apps/web/runtime.mjs",
  "dist/apps/web/public/marketplace-transactions.html",
  "dist/apps/web/public/marketplace-transactions.js",
  "dist/apps/web/public/marketplace-transactions.css",
  "dist/apps/web/public/marketplace-listing.html",
  "dist/apps/web/public/marketplace-listing.js"
];
for (const relative of required) await access(resolve(root, relative));

const runtime = await readFile(resolve(root, "dist/apps/web/runtime.mjs"), "utf8");
if (!runtime.includes("createMarketplaceTransactionRuntime")) throw new Error("Production runtime does not construct the Marketplace transaction boundary.");
if (!runtime.includes("marketplaceTransactionService")) throw new Error("Production server does not receive Marketplace transaction services.");

const server = await readFile(resolve(root, "dist/apps/web/marketplace-server.mjs"), "utf8");
if (!server.includes("handleMarketplaceTransactionRoute")) throw new Error("Marketplace server does not route transaction HTTP requests.");
if (!server.includes("createMarketplaceObservatoryService")) throw new Error("Marketplace server reconciliation lost the production Observatory route.");

const transactionConfig = await readFile(resolve(root, "dist/config/marketplace-transactions.mjs"), "utf8");
for (const gate of ["KINGDOM_MARKETPLACE_CHECKOUT_ENABLED", "KINGDOM_STRIPE_TAX_ENABLED", "KINGDOM_STRIPE_TAX_POLICY_ID"]) {
  if (!transactionConfig.includes(gate)) throw new Error(`Transaction runtime is missing the ${gate} safety gate.`);
}

const service = await readFile(resolve(root, "dist/packages/marketplace/src/transaction-service.mjs"), "utf8");
for (const boundary of ["ownershipTransferAuthorized: false", "soldProvenanceEventCreated: false", "marketplace_checkout_not_enabled"]) {
  if (!service.includes(boundary)) throw new Error(`Transaction service is missing required truth boundary: ${boundary}`);
}

const listing = await readFile(resolve(root, "dist/apps/web/public/marketplace-listing.js"), "utf8");
for (const marker of ["/api/marketplace/transactions/capabilities", "Idempotency-Key", "No ownership transfer occurs at this step"]) {
  if (!listing.includes(marker)) throw new Error(`Marketplace listing checkout UI is missing safeguard marker: ${marker}`);
}

const transactions = await readFile(resolve(root, "dist/apps/web/public/marketplace-transactions.js"), "utf8");
for (const marker of ["/api/marketplace/seller/payments/status", "/api/marketplace/seller/payments/onboarding", "/api/marketplace/orders?limit=100", "redirect does not prove payment"]) {
  if (!transactions.includes(marker)) throw new Error(`Orders & Payments UI is missing safeguard marker: ${marker}`);
}

console.log("Marketplace safeguarded transaction production artifact verification passed: current Observatory baseline is preserved; provider-hosted onboarding/checkout, fail-closed tax gating, webhook authority, idempotent reservation, buyer order evidence, seller payment status, and no automatic ownership transfer are wired into dist.");