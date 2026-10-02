const SHIPMENT_STATUS = "seller-declared-shipped";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS marketplace_shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES marketplace_orders(id) ON DELETE RESTRICT,
  seller_account_id TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  carrier TEXT,
  tracking_number TEXT,
  no_tracking_reason TEXT CHECK(no_tracking_reason IS NULL OR no_tracking_reason IN ('carrier-no-tracking','oversize-freight','other')),
  status TEXT NOT NULL CHECK(status = 'seller-declared-shipped'),
  evidence_source TEXT NOT NULL CHECK(evidence_source = 'seller'),
  request_sha256 TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  declared_shipped_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (
    (carrier IS NOT NULL AND tracking_number IS NOT NULL AND no_tracking_reason IS NULL)
    OR
    (carrier IS NULL AND tracking_number IS NULL AND no_tracking_reason IS NOT NULL)
  ),
  UNIQUE(seller_account_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS marketplace_shipments_order_idx
  ON marketplace_shipments(order_id,created_at ASC,id ASC);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_shipments_order_tracking_idx
  ON marketplace_shipments(order_id,carrier,tracking_number)
  WHERE tracking_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS marketplace_shipment_events (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES marketplace_shipments(id) ON DELETE RESTRICT,
  order_id TEXT NOT NULL REFERENCES marketplace_orders(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('seller','carrier','system')),
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS marketplace_shipment_events_order_idx
  ON marketplace_shipment_events(order_id,created_at ASC,id ASC);
`;

function parseJson(value) {
  try { return JSON.parse(value || "{}"); } catch { return {}; }
}

function mapShipment(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    orderId: row.order_id,
    sellerAccountId: row.seller_account_id,
    quantity: Number(row.quantity),
    carrier: row.carrier,
    trackingNumber: row.tracking_number,
    noTrackingReason: row.no_tracking_reason,
    status: row.status,
    evidenceSource: row.evidence_source,
    requestSha256: row.request_sha256,
    idempotencyKey: row.idempotency_key,
    declaredShippedAt: row.declared_shipped_at,
    createdAt: row.created_at
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
    listingRepresentationSha256: row.listing_snapshot_sha256,
    paymentProvider: row.payment_provider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at,
    refundedAt: row.refunded_at,
    disputedAt: row.disputed_at,
    title: row.title_snapshot ?? null,
    fulfillmentMethod: row.fulfillment_method ?? null
  });
}

function mapShipmentEvent(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    shipmentId: row.shipment_id,
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

const ORDER_SELECT = `
  SELECT o.*,l.title_snapshot,l.fulfillment_method
  FROM marketplace_orders o
  INNER JOIN marketplace_listings l ON l.id = o.listing_id
`;

export function createMarketplaceFulfillmentRepository({ vaultStore } = {}) {
  if (!vaultStore?.database || typeof vaultStore.database.prepare !== "function") {
    throw new TypeError("Marketplace fulfillment repository requires the Vault SQLite database boundary.");
  }
  const database = vaultStore.database;
  database.exec(SCHEMA);

  function findOrderById(orderId) {
    return mapOrder(database.prepare(`${ORDER_SELECT} WHERE o.id = ?`).get(orderId));
  }

  function findOrderForParty(accountId, orderId) {
    return mapOrder(database.prepare(`${ORDER_SELECT} WHERE o.id = ? AND (o.buyer_account_id = ? OR o.seller_account_id = ?)`)
      .get(orderId, accountId, accountId));
  }

  function findSellerOrder(sellerAccountId, orderId) {
    return mapOrder(database.prepare(`${ORDER_SELECT} WHERE o.id = ? AND o.seller_account_id = ?`).get(orderId, sellerAccountId));
  }

  function listSellerOrders(sellerAccountId, { limit = 50 } = {}) {
    const bounded = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return database.prepare(`${ORDER_SELECT} WHERE o.seller_account_id = ? ORDER BY o.updated_at DESC,o.id ASC LIMIT ?`)
      .all(sellerAccountId, bounded).map(mapOrder);
  }

  function listBuyerOrders(buyerAccountId, { limit = 50 } = {}) {
    const bounded = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return database.prepare(`${ORDER_SELECT} WHERE o.buyer_account_id = ? ORDER BY o.updated_at DESC,o.id ASC LIMIT ?`)
      .all(buyerAccountId, bounded).map(mapOrder);
  }

  function findShipmentById(shipmentId) {
    return mapShipment(database.prepare("SELECT * FROM marketplace_shipments WHERE id = ?").get(shipmentId));
  }

  function findShipmentByIdempotencyKey(sellerAccountId, idempotencyKey) {
    return mapShipment(database.prepare(`
      SELECT * FROM marketplace_shipments WHERE seller_account_id = ? AND idempotency_key = ?
    `).get(sellerAccountId, idempotencyKey));
  }

  function listOrderShipments(orderId) {
    return database.prepare("SELECT * FROM marketplace_shipments WHERE order_id = ? ORDER BY created_at ASC,id ASC")
      .all(orderId).map(mapShipment);
  }

  function listOrderShipmentEvents(orderId) {
    return database.prepare("SELECT * FROM marketplace_shipment_events WHERE order_id = ? ORDER BY created_at ASC,id ASC")
      .all(orderId).map(mapShipmentEvent);
  }

  function shippedQuantity(orderId) {
    const row = database.prepare("SELECT COALESCE(SUM(quantity),0) AS quantity FROM marketplace_shipments WHERE order_id = ?").get(orderId);
    return Number(row?.quantity ?? 0);
  }

  function createShipment(shipment) {
    return transaction(database, () => {
      const replay = findShipmentByIdempotencyKey(shipment.sellerAccountId, shipment.idempotencyKey);
      if (replay) return Object.freeze({ ok: true, shipment: replay, idempotentReplay: true });

      const order = findSellerOrder(shipment.sellerAccountId, shipment.orderId);
      if (!order) return Object.freeze({ ok: false, reason: "not_found" });
      if (order.state !== "paid") return Object.freeze({ ok: false, reason: "state", orderState: order.state });
      if (order.fulfillmentMethod === "local-pickup") return Object.freeze({ ok: false, reason: "local_pickup" });

      const alreadyShipped = shippedQuantity(order.id);
      const remainingQuantity = Math.max(0, order.quantity - alreadyShipped);
      if (shipment.quantity > remainingQuantity) {
        return Object.freeze({ ok: false, reason: "quantity", remainingQuantity });
      }

      if (shipment.trackingNumber) {
        const duplicateTracking = database.prepare(`
          SELECT 1 AS found FROM marketplace_shipments
          WHERE order_id = ? AND carrier = ? AND tracking_number = ?
        `).get(order.id, shipment.carrier, shipment.trackingNumber);
        if (duplicateTracking) return Object.freeze({ ok: false, reason: "tracking_duplicate" });
      }

      database.prepare(`
        INSERT INTO marketplace_shipments (
          id,order_id,seller_account_id,quantity,carrier,tracking_number,no_tracking_reason,status,evidence_source,
          request_sha256,idempotency_key,declared_shipped_at,created_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        shipment.id,
        order.id,
        shipment.sellerAccountId,
        shipment.quantity,
        shipment.carrier,
        shipment.trackingNumber,
        shipment.noTrackingReason,
        SHIPMENT_STATUS,
        "seller",
        shipment.requestSha256,
        shipment.idempotencyKey,
        shipment.declaredShippedAt,
        shipment.createdAt
      );
      database.prepare(`
        INSERT INTO marketplace_shipment_events (id,shipment_id,order_id,event_type,source,metadata_json,created_at)
        VALUES (?,?,?,?,?,?,?)
      `).run(
        shipment.event.id,
        shipment.id,
        order.id,
        shipment.event.eventType,
        "seller",
        JSON.stringify(shipment.event.metadata ?? {}),
        shipment.event.createdAt
      );
      return Object.freeze({ ok: true, shipment: findShipmentById(shipment.id), idempotentReplay: false });
    });
  }

  return Object.freeze({
    shipmentStatus: SHIPMENT_STATUS,
    findOrderById,
    findOrderForParty,
    findSellerOrder,
    listSellerOrders,
    listBuyerOrders,
    findShipmentById,
    findShipmentByIdempotencyKey,
    listOrderShipments,
    listOrderShipmentEvents,
    shippedQuantity,
    createShipment
  });
}
