import { randomUUID } from "node:crypto";
import { MarketplaceError } from "./service.mjs";

const CREATED_RESERVATION_TTL_MS = 10 * 60 * 1000;
const CHECKOUT_RESERVATION_TTL_MS = 60 * 60 * 1000;
const MAX_PUBLIC_AVAILABILITY_BATCH = 500;

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

function frozenUnavailable(listingId, checkedAt) {
  return Object.freeze({
    listingId,
    maximumQuantity: 0,
    reservedQuantity: 0,
    availableQuantity: 0,
    sellerPaymentReady: false,
    checkoutAvailable: false,
    checkoutCreatesOwnershipTransfer: false,
    reservationRecoveryAvailable: true,
    publicSupportCurrent: false,
    checkedAt
  });
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

  function availabilityMap(listingIdValues) {
    const ids = [...new Set((listingIdValues ?? []).map(cleanListingId))];
    if (ids.length > MAX_PUBLIC_AVAILABILITY_BATCH) {
      throw new MarketplaceError(
        "marketplace_availability_batch_too_large",
        `Marketplace availability batches may contain at most ${MAX_PUBLIC_AVAILABILITY_BATCH} listing identifiers.`,
        400
      );
    }
    const cleanup = expireStaleReservations();
    const result = new Map(ids.map((id) => [id, frozenUnavailable(id, cleanup.checkedAt)]));
    if (!ids.length) return result;

    const placeholders = ids.map(() => "?").join(",");
    const rows = database.prepare(`
      SELECT
        l.id,
        l.quantity AS listing_quantity,
        t.quantity AS vault_quantity,
        spa.status AS seller_payment_status,
        COALESCE(SUM(CASE
          WHEN o.state IN ('payment_processing','paid','refunded','disputed') THEN o.quantity
          WHEN o.state IN ('created','checkout_pending')
            AND o.reservation_expires_at IS NOT NULL
            AND o.reservation_expires_at > ? THEN o.quantity
          ELSE 0
        END),0) AS reserved_quantity
      FROM marketplace_listings l
      INNER JOIN vault_treasures t
        ON t.id = l.treasure_id
       AND t.owner_account_id = l.seller_account_id
       AND t.archived_at IS NULL
      LEFT JOIN marketplace_seller_payment_accounts spa
        ON spa.seller_account_id = l.seller_account_id
      LEFT JOIN marketplace_orders o
        ON o.listing_id = l.id
      WHERE l.state = 'active' AND l.id IN (${placeholders})
      GROUP BY l.id,l.quantity,t.quantity,spa.status
    `).all(cleanup.checkedAt, ...ids);

    for (const row of rows) {
      const maximum = Math.max(0, Math.min(Number(row.listing_quantity), Number(row.vault_quantity)));
      const reserved = Math.max(0, Number(row.reserved_quantity));
      const available = Math.max(0, maximum - reserved);
      const sellerPaymentReady = row.seller_payment_status === "active";
      result.set(row.id, Object.freeze({
        listingId: row.id,
        maximumQuantity: maximum,
        reservedQuantity: reserved,
        availableQuantity: available,
        sellerPaymentReady,
        checkoutAvailable: transactionService.checkoutEnabled === true && sellerPaymentReady && available > 0,
        checkoutCreatesOwnershipTransfer: false,
        reservationRecoveryAvailable: true,
        publicSupportCurrent: true,
        checkedAt: cleanup.checkedAt
      }));
    }
    return result;
  }

  function checkoutAvailability(listingIdValue) {
    const listingId = cleanListingId(listingIdValue);
    const publicListing = marketplaceService.getPublic(listingId);
    const availability = availabilityMap([listingId]).get(listingId);
    if (!availability?.publicSupportCurrent) {
      throw new MarketplaceError("marketplace_listing_not_found", "The requested active Marketplace listing was not found.", 404);
    }
    return Object.freeze({
      ...availability,
      representationSha256: publicListing.representationSha256 ?? null
    });
  }

  function decoratePublicListings(listings = []) {
    if (!Array.isArray(listings)) throw new TypeError("Marketplace public listings must be an array.");
    const map = availabilityMap(listings.map((listing) => listing?.id).filter(Boolean));
    return Object.freeze(listings.map((listing) => Object.freeze({
      ...listing,
      availability: map.get(listing.id) ?? frozenUnavailable(listing.id, now().toISOString())
    })));
  }

  function decoratePublicListing(listing) {
    if (!listing?.id) throw new TypeError("Marketplace public listing is required.");
    return decoratePublicListings([listing])[0];
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
    const result = await transactionService.handleProviderWebhook(rawBody, signatureHeader);
    expireStaleReservations();
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
    decoratePublicListing,
    decoratePublicListings,
    createCheckout,
    handleProviderWebhook,
    listMyOrders,
    getMyOrder
  });
}
