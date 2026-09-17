import { randomUUID } from "node:crypto";
import { MarketplaceError } from "./service.mjs";

const CREATED_RESERVATION_TTL_MS = 10 * 60 * 1000;
const CHECKOUT_RESERVATION_TTL_MS = 60 * 60 * 1000;
const HELD_STATES = Object.freeze(["payment_processing", "paid", "refunded", "disputed"]);

function cleanListingId(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 100) {
    throw new MarketplaceError("invalid_marketplace_listing_id", "The Marketplace listing identifier is invalid.");
  }
  return value.trim();
}

function addMilliseconds(isoValue, milliseconds) {
  const base = new Date(isoValue);
  if (!Number.isFinite(base.getTime())) throw new TypeError("Marketplace reservation timestamp is invalid.");
  return new Date(base.getTime() + milliseconds).toISOString();
}

function transaction(database, work) {
  database.exec("BEGIN IMMEDIATE;");
  try {
    const result = work();
    database.exec("COMMIT;");
    return result;
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

export function createMarketplaceReservationGuard({
  vaultStore,
  marketplaceService,
  transactionService,
  now = () => new Date()
} = {}) {
  if (!vaultStore?.database || typeof vaultStore.database.prepare !== "function") {
    throw new TypeError("Marketplace reservation guard requires the Vault SQLite database boundary.");
  }
  if (!marketplaceService?.getPublic) {
    throw new TypeError("Marketplace reservation guard requires public listing integrity reads.");
  }
  if (!transactionService?.createCheckout) {
    throw new TypeError("Marketplace reservation guard requires the transaction service.");
  }
  if (typeof now !== "function") throw new TypeError("Marketplace reservation guard now must be a function.");

  const database = vaultStore.database;
  const columns = database.prepare("PRAGMA table_info(marketplace_orders)").all();
  if (!columns.some((column) => column.name === "reservation_expires_at")) {
    database.exec("ALTER TABLE marketplace_orders ADD COLUMN reservation_expires_at TEXT;");
  }
  database.exec(`
    CREATE INDEX IF NOT EXISTS marketplace_orders_reservation_expiry_idx
      ON marketplace_orders(state,reservation_expires_at,listing_id);

    CREATE TRIGGER IF NOT EXISTS marketplace_orders_created_reservation_expiry
    AFTER INSERT ON marketplace_orders
    WHEN NEW.state = 'created' AND NEW.reservation_expires_at IS NULL
    BEGIN
      UPDATE marketplace_orders
      SET reservation_expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at, '+10 minutes')
      WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS marketplace_orders_checkout_reservation_expiry
    AFTER UPDATE OF state ON marketplace_orders
    WHEN NEW.state = 'checkout_pending'
    BEGIN
      UPDATE marketplace_orders
      SET reservation_expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', NEW.updated_at, '+60 minutes')
      WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS marketplace_orders_clear_reservation_expiry
    AFTER UPDATE OF state ON marketplace_orders
    WHEN NEW.state NOT IN ('created','checkout_pending') AND NEW.reservation_expires_at IS NOT NULL
    BEGIN
      UPDATE marketplace_orders SET reservation_expires_at = NULL WHERE id = NEW.id;
    END;
  `);

  const legacyCreated = database.prepare(`
    SELECT id,created_at FROM marketplace_orders
    WHERE state = 'created' AND reservation_expires_at IS NULL
  `).all();
  const legacyCheckout = database.prepare(`
    SELECT id,updated_at FROM marketplace_orders
    WHERE state = 'checkout_pending' AND reservation_expires_at IS NULL
  `).all();
  transaction(database, () => {
    const setExpiry = database.prepare("UPDATE marketplace_orders SET reservation_expires_at = ? WHERE id = ?");
    for (const row of legacyCreated) setExpiry.run(addMilliseconds(row.created_at, CREATED_RESERVATION_TTL_MS), row.id);
    for (const row of legacyCheckout) setExpiry.run(addMilliseconds(row.updated_at, CHECKOUT_RESERVATION_TTL_MS), row.id);
  });

  function expireStaleReservations() {
    const timestamp = now().toISOString();
    return transaction(database, () => {
      const stale = database.prepare(`
        SELECT id,state,reservation_expires_at FROM marketplace_orders
        WHERE state IN ('created','checkout_pending')
          AND reservation_expires_at IS NOT NULL
          AND reservation_expires_at <= ?
        ORDER BY reservation_expires_at ASC,id ASC
      `).all(timestamp);
      const cancel = database.prepare(`
        UPDATE marketplace_orders
        SET state = 'cancelled', updated_at = ?, cancelled_at = COALESCE(cancelled_at, ?), reservation_expires_at = NULL
        WHERE id = ? AND state IN ('created','checkout_pending')
      `);
      const writeEvent = database.prepare(`
        INSERT INTO marketplace_order_events (id,order_id,event_type,source,metadata_json,created_at)
        VALUES (?,?,?,?,?,?)
      `);
      let expired = 0;
      for (const row of stale) {
        const result = cancel.run(timestamp, timestamp, row.id);
        if (Number(result.changes) !== 1) continue;
        writeEvent.run(
          randomUUID(),
          row.id,
          "marketplace.reservation_expired",
          "system",
          JSON.stringify({ previousState: row.state, reservationExpiresAt: row.reservation_expires_at, ownershipTransferred: false }),
          timestamp
        );
        expired += 1;
      }
      return Object.freeze({ expired, checkedAt: timestamp });
    });
  }

  function ensureReservationDeadline(orderId, state) {
    if (!orderId) return;
    const timestamp = now().toISOString();
    const ttl = state === "checkout_pending" ? CHECKOUT_RESERVATION_TTL_MS : CREATED_RESERVATION_TTL_MS;
    const expiresAt = addMilliseconds(timestamp, ttl);
    database.prepare(`
      UPDATE marketplace_orders
      SET reservation_expires_at = ?
      WHERE id = ? AND state = ? AND reservation_expires_at IS NULL
    `).run(expiresAt, orderId, state);
  }

  function clearDeadlineForDurableState(orderId) {
    if (!orderId) return;
    database.prepare(`
      UPDATE marketplace_orders SET reservation_expires_at = NULL
      WHERE id = ? AND state NOT IN ('created','checkout_pending')
    `).run(orderId);
  }

  function checkoutAvailability(listingIdValue) {
    const listingId = cleanListingId(listingIdValue);
    const publicListing = marketplaceService.getPublic(listingId);
    const cleanup = expireStaleReservations();
    const source = database.prepare(`
      SELECT l.id,l.quantity AS listing_quantity,t.quantity AS vault_quantity,l.seller_account_id
      FROM marketplace_listings l
      INNER JOIN vault_treasures t
        ON t.id = l.treasure_id
       AND t.owner_account_id = l.seller_account_id
       AND t.archived_at IS NULL
      WHERE l.id = ? AND l.state = 'active'
    `).get(listingId);
    if (!source) throw new MarketplaceError("marketplace_listing_not_found", "The requested active Marketplace listing was not found.", 404);

    const current = cleanup.checkedAt;
    const heldMarks = HELD_STATES.map(() => "?").join(",");
    const reserved = Number(database.prepare(`
      SELECT COALESCE(SUM(quantity),0) AS quantity
      FROM marketplace_orders
      WHERE listing_id = ? AND (
        state IN (${heldMarks}) OR
        (state IN ('created','checkout_pending') AND reservation_expires_at IS NOT NULL AND reservation_expires_at > ?)
      )
    `).get(listingId, ...HELD_STATES, current).quantity);
    const maximum = Math.max(0, Math.min(Number(source.listing_quantity), Number(source.vault_quantity)));
    const available = Math.max(0, maximum - reserved);
    const sellerPayment = database.prepare(`
      SELECT status FROM marketplace_seller_payment_accounts WHERE seller_account_id = ?
    `).get(source.seller_account_id);
    const sellerPaymentReady = sellerPayment?.status === "active";

    return Object.freeze({
      listingId,
      representationSha256: publicListing.representationSha256 ?? null,
      maximumQuantity: maximum,
      reservedQuantity: reserved,
      availableQuantity: available,
      sellerPaymentReady,
      checkoutAvailable: transactionService.checkoutEnabled === true && sellerPaymentReady && available > 0,
      checkoutCreatesOwnershipTransfer: false,
      reservationRecoveryAvailable: true,
      checkedAt: current
    });
  }

  async function createCheckout(identity, listingId, input) {
    expireStaleReservations();
    const result = await transactionService.createCheckout(identity, listingId, input);
    const orderId = result?.order?.id ?? null;
    const state = result?.order?.state ?? null;
    if (state === "created" || state === "checkout_pending") ensureReservationDeadline(orderId, state);
    else clearDeadlineForDurableState(orderId);
    return result;
  }

  async function handleProviderWebhook(rawBody, signatureHeader) {
    expireStaleReservations();
    const result = await transactionService.handleProviderWebhook(rawBody, signatureHeader);
    if (result?.orderId) clearDeadlineForDurableState(result.orderId);
    return result;
  }

  function listMyOrders(identity, options) {
    expireStaleReservations();
    return transactionService.listMyOrders(identity, options);
  }

  function getMyOrder(identity, orderId) {
    expireStaleReservations();
    return transactionService.getMyOrder(identity, orderId);
  }

  return Object.freeze({
    ...transactionService,
    reservationRecoveryAvailable: true,
    expireStaleReservations,
    getCheckoutAvailability: checkoutAvailability,
    createCheckout,
    handleProviderWebhook,
    listMyOrders,
    getMyOrder
  });
}
