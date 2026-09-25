const DURABLE_HELD_STATES_SQL = "'payment_processing','paid','refunded','disputed'";
const EXPIRING_HELD_STATES_SQL = "'created','checkout_pending'";

function hasReservationSchema(database) {
  const table = database.prepare(`
    SELECT 1 AS present
    FROM sqlite_master
    WHERE type = 'table' AND name = 'marketplace_orders'
    LIMIT 1
  `).get();
  if (!table) return false;
  return database.prepare("PRAGMA table_info(marketplace_orders)")
    .all()
    .some((column) => column.name === "reservation_expires_at");
}

function checkedAtIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("Sellable inventory checkedAt must be a valid date.");
  return date.toISOString();
}

export function sellableInventoryConstraint(database, { checkedAt = new Date() } = {}) {
  if (!database?.prepare) throw new TypeError("Sellable inventory requires a SQLite database boundary.");
  if (!hasReservationSchema(database)) {
    return Object.freeze({ enabled: false, sql: "1 = 1", values: Object.freeze([]) });
  }

  const timestamp = checkedAtIso(checkedAt);
  return Object.freeze({
    enabled: true,
    sql: `COALESCE((
      SELECT SUM(o.quantity)
      FROM marketplace_orders o
      WHERE o.listing_id = l.id
        AND (
          o.state IN (${DURABLE_HELD_STATES_SQL})
          OR (
            o.state IN (${EXPIRING_HELD_STATES_SQL})
            AND o.reservation_expires_at IS NOT NULL
            AND o.reservation_expires_at > ?
          )
        )
    ), 0) < MIN(l.quantity, t.quantity)`,
    values: Object.freeze([timestamp])
  });
}
