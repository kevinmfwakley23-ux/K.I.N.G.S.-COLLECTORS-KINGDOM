import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "dist/packages/marketplace/src/fulfillment-repository.mjs",
  "dist/packages/marketplace/src/fulfillment-service.mjs",
  "dist/apps/web/marketplace-fulfillment-http.mjs",
  "dist/packages/marketplace/src/transaction-runtime.mjs",
  "dist/apps/web/marketplace-server.mjs",
  "dist/apps/web/runtime.mjs",
  "dist/apps/web/public/marketplace-transactions.html",
  "dist/apps/web/public/marketplace-transactions.js",
  "dist/apps/web/public/marketplace-transactions.css"
];
for (const relative of required) await access(resolve(root, relative));

const repository = await readFile(resolve(root, "dist/packages/marketplace/src/fulfillment-repository.mjs"), "utf8");
for (const marker of [
  "marketplace_shipments",
  "marketplace_shipment_events",
  "seller-declared-shipped",
  "UNIQUE(seller_account_id,idempotency_key)",
  "state !== \"paid\""
]) {
  if (!repository.includes(marker)) throw new Error(`Fulfillment repository is missing production safeguard: ${marker}`);
}

const service = await readFile(resolve(root, "dist/packages/marketplace/src/fulfillment-service.mjs"), "utf8");
for (const marker of [
  "evidenceAuthority: \"seller-declared\"",
  "evidenceSha256: shipment.requestSha256",
  "appendOnlyEvidenceTimelineAvailable: true",
  "carrierVerified: false",
  "deliveryVerified: false",
  "ownershipTransferAuthorized: false",
  "soldProvenanceEventCreated: false",
  "marketplace_shipment_order_not_paid",
  "marketplace_shipment_idempotency_conflict"
]) {
  if (!service.includes(marker)) throw new Error(`Fulfillment service is missing truth boundary: ${marker}`);
}

const server = await readFile(resolve(root, "dist/apps/web/marketplace-server.mjs"), "utf8");
if (!server.includes("handleMarketplaceFulfillmentRoute")) throw new Error("Marketplace server does not route fulfillment evidence requests.");
if (!server.includes("createMarketplaceObservatoryService")) throw new Error("Fulfillment wiring displaced the Marketplace Observatory.");
if (!server.includes("handleMarketplaceTransactionRoute")) throw new Error("Fulfillment wiring displaced safeguarded transactions.");

const runtime = await readFile(resolve(root, "dist/apps/web/runtime.mjs"), "utf8");
if (!runtime.includes("marketplaceFulfillmentService")) throw new Error("Production runtime does not construct/pass the Marketplace fulfillment service.");
if (!runtime.includes("marketplaceCarrierVerificationAvailable: false")) throw new Error("Production runtime must not claim carrier verification.");
if (!runtime.includes("marketplaceDeliveryVerificationAvailable: false")) throw new Error("Production runtime must not claim delivery verification.");

const http = await readFile(resolve(root, "dist/apps/web/marketplace-fulfillment-http.mjs"), "utf8");
for (const marker of [
  "/api/marketplace/fulfillment/orders",
  "/api/marketplace/fulfillment/seller/orders",
  "Idempotency-Key",
  "recordShipment"
]) {
  if (!http.includes(marker)) throw new Error(`Fulfillment HTTP boundary is missing: ${marker}`);
}

const ui = await readFile(resolve(root, "dist/apps/web/public/marketplace-transactions.js"), "utf8");
for (const marker of [
  "/api/marketplace/fulfillment/capabilities",
  "/api/marketplace/fulfillment/seller/orders?limit=100",
  "Carrier verified: No · Delivery verified: No",
  "Evidence SHA-256",
  "View evidence timeline",
  "Recording append-only seller shipment evidence"
]) {
  if (!ui.includes(marker)) throw new Error(`Orders & Payments fulfillment UI is missing: ${marker}`);
}

console.log("Marketplace fulfillment evidence production artifact verification passed: paid-state-only seller shipment evidence, bounded/idempotent quantities, buyer/seller visibility, explicit no carrier or delivery verification, and no automatic provenance or ownership transfer are wired into dist without displacing transactions or the Observatory.");
