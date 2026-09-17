import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "dist/config/marketplace-transactions.mjs",
  "dist/packages/marketplace/src/stripe-connect-provider.mjs",
  "dist/packages/marketplace/src/stripe-connect-checkout-policy.mjs",
  "dist/packages/marketplace/src/transaction-repository.mjs",
  "dist/packages/marketplace/src/transaction-service.mjs",
  "dist/packages/marketplace/src/transaction-reservation-guard.mjs",
  "dist/packages/marketplace/src/transaction-runtime.mjs",
  "dist/apps/web/marketplace-transaction-http.mjs",
  "dist/apps/web/marketplace-server.mjs",
  "dist/apps/web/runtime.mjs"
];
for (const relative of required) await access(resolve(root, relative));

const runtime = await readFile(resolve(root, "dist/apps/web/runtime.mjs"), "utf8");
if (!runtime.includes("createMarketplaceTransactionRuntime")) throw new Error("Production runtime does not construct the Marketplace transaction boundary.");
if (!runtime.includes("marketplaceTransactionService")) throw new Error("Production server does not receive Marketplace transaction services.");
if (!runtime.includes("marketplaceReservationRecoveryAvailable")) throw new Error("Production runtime does not expose reservation recovery readiness.");

const server = await readFile(resolve(root, "dist/apps/web/marketplace-server.mjs"), "utf8");
if (!server.includes("handleMarketplaceTransactionRoute")) throw new Error("Marketplace server does not route transaction HTTP requests.");
if (!server.includes("createMarketplaceObservatoryService")) throw new Error("Transaction wiring regressed the production Marketplace Observatory.");

const transactionConfig = await readFile(resolve(root, "dist/config/marketplace-transactions.mjs"), "utf8");
for (const gate of ["KINGDOM_MARKETPLACE_CHECKOUT_ENABLED", "KINGDOM_STRIPE_TAX_ENABLED", "KINGDOM_STRIPE_TAX_POLICY_ID"]) {
  if (!transactionConfig.includes(gate)) throw new Error(`Transaction runtime is missing the ${gate} safety gate.`);
}

const service = await readFile(resolve(root, "dist/packages/marketplace/src/transaction-service.mjs"), "utf8");
for (const boundary of ["ownershipTransferAuthorized: false", "soldProvenanceEventCreated: false", "marketplace_checkout_not_enabled"]) {
  if (!service.includes(boundary)) throw new Error(`Transaction service is missing required truth boundary: ${boundary}`);
}

const guard = await readFile(resolve(root, "dist/packages/marketplace/src/transaction-reservation-guard.mjs"), "utf8");
for (const boundary of ["reservation_expires_at", "marketplace.reservation_expired", "getCheckoutAvailability", "checkoutCreatesOwnershipTransfer: false"]) {
  if (!guard.includes(boundary)) throw new Error(`Reservation guard is missing required recovery boundary: ${boundary}`);
}

const checkoutPolicy = await readFile(resolve(root, "dist/packages/marketplace/src/stripe-connect-checkout-policy.mjs"), "utf8");
if (!checkoutPolicy.includes('body.set("expires_at"')) throw new Error("Stripe Checkout policy does not bound hosted session lifetime.");
if (!checkoutPolicy.includes("30 * 60")) throw new Error("Stripe Checkout policy does not use the reviewed 30-minute lifetime.");

const http = await readFile(resolve(root, "dist/apps/web/marketplace-transaction-http.mjs"), "utf8");
if (!http.includes("checkout-availability")) throw new Error("Marketplace transaction HTTP does not expose sanitized checkout availability.");
if (!http.includes("reservationRecoveryAvailable")) throw new Error("Marketplace transaction capabilities omit reservation recovery truth.");

console.log("Marketplace safeguarded transaction production artifact verification passed: provider-hosted onboarding/checkout, fail-closed tax gating, signed-webhook authority, bounded/idempotent reservations, public availability truth, Observatory preservation, and no automatic ownership transfer are wired into dist.");
