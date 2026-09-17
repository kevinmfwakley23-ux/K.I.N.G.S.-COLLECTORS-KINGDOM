const ORDER_STATES = Object.freeze([
  "created",
  "checkout_pending",
  "payment_processing",
  "paid",
  "payment_failed",
  "cancelled",
  "refunded",
  "disputed"
]);
const RESERVING_STATES = Object.freeze(["created", "checkout_pending", "payment_processing", "paid", "refunded", "disputed"]);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS marketplace_seller_payment_accounts (
  seller_account_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('onboarding','restricted','active','disabled')),
  charges_enabled INTEGER NOT NULL DEFAULT 0,
  payouts_enabled INTEGER NOT NULL DEFAULT 0,
  details_submitted INTEGER NOT NULL DEFAULT 0,
  transfers_status TEXT,
  requirements_due_count INTEGER NOT NULL DEFAULT 0,
  disabled_reason TEXT,
  provider_policy_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS marketplace_orders (
  id TEXT PRIMARY KEY,
  buyer_account_id TEXT NOT NULL,
  seller_account_id TEXT NOT NULL,
  listing_id TEXT NOT NULL REFERENCES marketplace_listings(id) ON DELETE RESTRICT,
  state TEXT NOT NULL CHECK(state IN ('created','checkout_pending','payment_processing','paid','payment_failed','cancelled','refunded','disputed')),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  unit_amount_cents INTEGER NOT NULL CHECK(unit_amount_cents > 0),
  total_amount_cents INTEGER NOT NULL CHECK(total_amount_cents > 0),
  currency TEXT NOT NULL,
  listing_snapshot_sha256 TEXT NOT NULL,
  request_sha256 TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payment_provider TEXT,
  provider_checkout_session_id TEXT UNIQUE,
  provider_checkout_url TEXT,
  provider_payment_intent_id TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  paid_at TEXT,
  cancelled_at TEXT,
  refunded_at TEXT,
  disputed_at TEXT,
  UNIQUE(buyer_account_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS marketplace_orders_listing_state_idx ON marketplace_orders(listing_id,state,created_at,id);
CREATE INDEX IF NOT EXISTS marketplace_orders_buyer_updated_idx ON marketplace_orders(buyer_account_id,updated_at DESC,id);
CREATE INDEX IF NOT EXISTS marketplace_orders_seller_updated_idx ON marketplace_orders(seller_account_id,updated_at DESC,id);

CREATE TABLE IF NOT EXISTS marketplace_order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES marketplace_orders(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('buyer','seller','provider','system')),
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS marketplace_order_events_order_idx ON marketplace_order_events(order_id,created_at ASC,id ASC);

CREATE TABLE IF NOT EXISTS marketplace_provider_events (
  provider_event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  object_id TEXT,
  processed_at TEXT NOT NULL
);
`;

function parseJson(value) {
  try { return JSON.parse(value || "{}"); } catch { return {}; }
}

function mapPaymentAccount(row) {
  if (!row) return null;
  return Object.freeze({
    sellerAccountId: row.seller_account_id,
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    status: row.status,
    chargesEnabled: Boolean(row.charges_enabled),
    payoutsEnabled: Boolean(row.payouts_enabled),
    detailsSubmitted: Boolean(row.details_submitted),
    transfersStatus: row.transfers_status,
    requirementsDueCount: Number(row.requirements_due_count),
    disabledReason: row.disabled_reason,
    providerPolicyId: row.provider_policy_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

function mapOrder(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    buyerAccountId: row.buyer_account_id,
    sellerAccountId: row.seller_account_id,
    listingId: row.listing_id,
    state: row.state,
    quantity: Number(row.quantity),
    unitAmountCents: Number(row.unit_amount_cents),
    totalAmountCents: Number(row.total_amount_cents),
    currency: row.currency,
    listingSnapshotSha256: row.listing_snapshot_sha256,
    requestSha256: row.request_sha256,
    idempotencyKey: row.idempotency_key,
    paymentProvider: row.payment_provider,
    providerCheckoutSessionId: row.provider_checkout_session_id,
    providerCheckoutUrl: row.provider_checkout_url,
    providerPaymentIntentId: row.provider_payment_intent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at,
    cancelledAt: row.cancelled_at,
    refundedAt: row.refunded_at,
    disputedAt: row.disputed_at
  });
}

function mapOrderEvent(row) {
  return Object.freeze({
    id: row.id,
    orderId: row.order_id,
    eventType: row.event_type,
    source: row.source,
    metadata: Object.freeze(parseJson(row.metadata_json)),
    createdAt: row.created_at
  });
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

function insertEvent(database, event) {
  database.prepare(`
    INSERT INTO marketplace_order_events (id,order_id,event_type,source,metadata_json,created_at)
    VALUES (?,?,?,?,?,?)
  `).run(event.id, event.orderId, event.eventType, event.source, JSON.stringify(event.metadata ?? {}), event.createdAt);
}

function insertProviderEvent(database, { providerEventId, provider, eventType, objectId = null, processedAt }) {
  return database.prepare(`
    INSERT OR IGNORE INTO marketplace_provider_events (provider_event_id,provider,event_type,object_id,processed_at)
    VALUES (?,?,?,?,?)
  `).run(providerEventId, provider, eventType, objectId, processedAt);
}

function timestampColumnForState(state) {
  return ({ paid: "paid_at", cancelled: "cancelled_at", refunded: "refunded_at", disputed: "disputed_at" })[state] ?? null;
}

export function createMarketplaceTransactionRepository({ vaultStore } = {}) {
  if (!vaultStore?.database || typeof vaultStore.database.prepare !== "function") throw new TypeError("Marketplace transaction repository requires the Vault SQLite database boundary.");
  const database = vaultStore.database;
  database.exec(SCHEMA);

  function upsertSellerPaymentAccount(account) {
    database.prepare(`
      INSERT INTO marketplace_seller_payment_accounts (
        seller_account_id,provider,provider_account_id,status,charges_enabled,payouts_enabled,details_submitted,
        transfers_status,requirements_due_count,disabled_reason,provider_policy_id,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(seller_account_id) DO UPDATE SET
        provider=excluded.provider,
        provider_account_id=excluded.provider_account_id,
        status=excluded.status,
        charges_enabled=excluded.charges_enabled,
        payouts_enabled=excluded.payouts_enabled,
        details_submitted=excluded.details_submitted,
        transfers_status=excluded.transfers_status,
        requirements_due_count=excluded.requirements_due_count,
        disabled_reason=excluded.disabled_reason,
        provider_policy_id=excluded.provider_policy_id,
        updated_at=excluded.updated_at
    `).run(
      account.sellerAccountId, account.provider, account.providerAccountId, account.status,
      account.chargesEnabled ? 1 : 0, account.payoutsEnabled ? 1 : 0, account.detailsSubmitted ? 1 : 0,
      account.transfersStatus ?? null, account.requirementsDueCount ?? 0, account.disabledReason ?? null,
      account.providerPolicyId, account.createdAt, account.updatedAt
    );
    return findSellerPaymentAccount(account.sellerAccountId);
  }

  function findSellerPaymentAccount(sellerAccountId) {
    return mapPaymentAccount(database.prepare("SELECT * FROM marketplace_seller_payment_accounts WHERE seller_account_id = ?").get(sellerAccountId));
  }

  function findSellerPaymentAccountByProviderId(providerAccountId) {
    return mapPaymentAccount(database.prepare("SELECT * FROM marketplace_seller_payment_accounts WHERE provider_account_id = ?").get(providerAccountId));
  }

  function reserveOrder(order) {
    return transaction(database, () => {
      const existing = mapOrder(database.prepare(`
        SELECT * FROM marketplace_orders WHERE buyer_account_id = ? AND idempotency_key = ?
      `).get(order.buyerAccountId, order.idempotencyKey));
      if (existing) return Object.freeze({ ok: true, order: existing, idempotentReplay: true });

      const listing = database.prepare(`
        SELECT l.id,l.seller_account_id,l.quantity AS listing_quantity,l.amount_cents,l.currency,l.published_snapshot_sha256,
               l.title_snapshot,t.quantity AS vault_quantity
        FROM marketplace_listings l
        INNER JOIN vault_treasures t ON t.id = l.treasure_id AND t.owner_account_id = l.seller_account_id
        WHERE l.id = ? AND l.state = 'active' AND t.archived_at IS NULL AND t.quantity > 0
      `).get(order.listingId);
      if (!listing) return Object.freeze({ ok: false, reason: "unavailable" });
      if (listing.seller_account_id === order.buyerAccountId) return Object.freeze({ ok: false, reason: "own_listing" });
      if (listing.published_snapshot_sha256 !== order.listingSnapshotSha256) return Object.freeze({ ok: false, reason: "representation_changed" });
      if (Number(listing.amount_cents) !== order.unitAmountCents || listing.currency !== order.currency) return Object.freeze({ ok: false, reason: "terms_changed" });

      const bindMarks = RESERVING_STATES.map(() => "?").join(",");
      const reserved = Number(database.prepare(`
        SELECT COALESCE(SUM(quantity),0) AS quantity
        FROM marketplace_orders
        WHERE listing_id = ? AND state IN (${bindMarks})
      `).get(order.listingId, ...RESERVING_STATES).quantity);
      const maximum = Math.min(Number(listing.listing_quantity), Number(listing.vault_quantity));
      const available = Math.max(0, maximum - reserved);
      if (order.quantity > available) return Object.freeze({ ok: false, reason: "quantity", availableQuantity: available });

      database.prepare(`
        INSERT INTO marketplace_orders (
          id,buyer_account_id,seller_account_id,listing_id,state,quantity,unit_amount_cents,total_amount_cents,currency,
          listing_snapshot_sha256,request_sha256,idempotency_key,payment_provider,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        order.id, order.buyerAccountId, listing.seller_account_id, order.listingId, order.state, order.quantity,
        order.unitAmountCents, order.totalAmountCents, order.currency, order.listingSnapshotSha256, order.requestSha256,
        order.idempotencyKey, order.paymentProvider ?? null, order.createdAt, order.updatedAt
      );
      insertEvent(database, order.initialEvent);
      return Object.freeze({ ok: true, order: findOrderById(order.id), idempotentReplay: false });
    });
  }

  function findOrderById(id) {
    return mapOrder(database.prepare("SELECT * FROM marketplace_orders WHERE id = ?").get(id));
  }

  function findBuyerOrder(buyerAccountId, id) {
    return mapOrder(database.prepare("SELECT * FROM marketplace_orders WHERE buyer_account_id = ? AND id = ?").get(buyerAccountId, id));
  }

  function listBuyerOrders(buyerAccountId, { limit = 50 } = {}) {
    const bounded = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return database.prepare(`SELECT * FROM marketplace_orders WHERE buyer_account_id = ? ORDER BY updated_at DESC,id ASC LIMIT ?`).all(buyerAccountId, bounded).map(mapOrder);
  }

  function attachCheckout(orderId, { provider, checkoutSessionId, checkoutUrl, paymentIntentId = null, updatedAt, event }) {
    return transaction(database, () => {
      const result = database.prepare(`
        UPDATE marketplace_orders SET state='checkout_pending',payment_provider=?,provider_checkout_session_id=?,provider_checkout_url=?,
          provider_payment_intent_id=COALESCE(?,provider_payment_intent_id),updated_at=?
        WHERE id=? AND state='created'
      `).run(provider, checkoutSessionId, checkoutUrl, paymentIntentId, updatedAt, orderId);
      if (Number(result.changes) !== 1) return null;
      insertEvent(database, event);
      return findOrderById(orderId);
    });
  }

  function transitionOrder(orderId, nextState, { updatedAt, paymentIntentId = null, event, timestampField = null } = {}) {
    if (!ORDER_STATES.includes(nextState)) throw new TypeError("Unsupported Marketplace order state.");
    const timestampColumn = timestampColumnForState(timestampField ?? nextState);
    return transaction(database, () => {
      const current = findOrderById(orderId);
      if (!current) return null;
      const assignments = ["state = ?", "updated_at = ?"];
      const values = [nextState, updatedAt];
      if (paymentIntentId) {
        assignments.push("provider_payment_intent_id = COALESCE(provider_payment_intent_id, ?)");
        values.push(paymentIntentId);
      }
      if (timestampColumn) {
        assignments.push(`${timestampColumn} = COALESCE(${timestampColumn}, ?)`);
        values.push(updatedAt);
      }
      values.push(orderId);
      database.prepare(`UPDATE marketplace_orders SET ${assignments.join(",")} WHERE id = ?`).run(...values);
      if (event) insertEvent(database, event);
      return findOrderById(orderId);
    });
  }

  function findOrderByCheckoutSessionId(id) {
    return mapOrder(database.prepare("SELECT * FROM marketplace_orders WHERE provider_checkout_session_id = ?").get(id));
  }

  function findOrderByPaymentIntentId(id) {
    return mapOrder(database.prepare("SELECT * FROM marketplace_orders WHERE provider_payment_intent_id = ?").get(id));
  }

  function listOrderEvents(orderId) {
    return database.prepare("SELECT * FROM marketplace_order_events WHERE order_id = ? ORDER BY created_at ASC,id ASC").all(orderId).map(mapOrderEvent);
  }

  function hasProviderEvent(providerEventId) {
    return Boolean(database.prepare("SELECT 1 AS found FROM marketplace_provider_events WHERE provider_event_id = ?").get(providerEventId));
  }

  function recordProviderEventOnce({ providerEventId, provider, eventType, objectId = null, processedAt }) {
    const result = insertProviderEvent(database, { providerEventId, provider, eventType, objectId, processedAt });
    return Number(result.changes) === 1;
  }

  function applyProviderOrderEventOnce({
    providerEventId,
    provider,
    providerEventType,
    objectId = null,
    processedAt,
    transitionAt = processedAt,
    orderId,
    nextState = null,
    allowedFromStates = [],
    paymentIntentId = null,
    orderEvent = null
  }) {
    if (nextState !== null && !ORDER_STATES.includes(nextState)) throw new TypeError("Unsupported Marketplace provider order state.");
    return transaction(database, () => {
      if (database.prepare("SELECT 1 AS found FROM marketplace_provider_events WHERE provider_event_id = ?").get(providerEventId)) {
        return Object.freeze({ duplicate: true, order: orderId ? findOrderById(orderId) : null, stateConflict: false });
      }

      let current = orderId ? findOrderById(orderId) : null;
      let stateConflict = false;
      if (current && nextState && current.state !== nextState) {
        if (!allowedFromStates.includes(current.state)) {
          stateConflict = true;
        } else {
          const timestampColumn = timestampColumnForState(nextState);
          const assignments = ["state = ?", "updated_at = ?"];
          const values = [nextState, transitionAt];
          if (paymentIntentId) {
            assignments.push("provider_payment_intent_id = COALESCE(provider_payment_intent_id, ?)");
            values.push(paymentIntentId);
          }
          if (timestampColumn) {
            assignments.push(`${timestampColumn} = COALESCE(${timestampColumn}, ?)`);
            values.push(transitionAt);
          }
          values.push(current.id);
          database.prepare(`UPDATE marketplace_orders SET ${assignments.join(",")} WHERE id = ?`).run(...values);
          current = findOrderById(current.id);
        }
      } else if (current && paymentIntentId && !current.providerPaymentIntentId) {
        database.prepare("UPDATE marketplace_orders SET provider_payment_intent_id = ?, updated_at = ? WHERE id = ? AND provider_payment_intent_id IS NULL")
          .run(paymentIntentId, transitionAt, current.id);
        current = findOrderById(current.id);
      }

      if (current && orderEvent) {
        const eventToWrite = stateConflict
          ? Object.freeze({
              ...orderEvent,
              eventType: "marketplace.provider_event_ignored_state_conflict",
              metadata: Object.freeze({
                ...(orderEvent.metadata ?? {}),
                ignoredStateConflict: true,
                currentState: current.state,
                attemptedState: nextState
              })
            })
          : orderEvent;
        insertEvent(database, eventToWrite);
      }

      insertProviderEvent(database, {
        providerEventId,
        provider,
        eventType: providerEventType,
        objectId,
        processedAt
      });
      return Object.freeze({ duplicate: false, order: current, stateConflict });
    });
  }

  return Object.freeze({
    orderStates: ORDER_STATES,
    reservingStates: RESERVING_STATES,
    upsertSellerPaymentAccount,
    findSellerPaymentAccount,
    findSellerPaymentAccountByProviderId,
    reserveOrder,
    findOrderById,
    findBuyerOrder,
    listBuyerOrders,
    attachCheckout,
    transitionOrder,
    findOrderByCheckoutSessionId,
    findOrderByPaymentIntentId,
    listOrderEvents,
    hasProviderEvent,
    recordProviderEventOnce,
    applyProviderOrderEventOnce
  });
}
