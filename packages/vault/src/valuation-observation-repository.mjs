const SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_valuation_provider_observations (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  provider_policy_id TEXT NOT NULL,
  provider_policy_url TEXT,
  provider_observation_id TEXT NOT NULL,
  provider_item_reference TEXT,
  observation_type TEXT NOT NULL CHECK(observation_type IN ('retail-price','buylist-price','sold-comparable','asking-listing')),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_reference TEXT,
  observed_date TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  provider_build_at TEXT,
  amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0),
  currency TEXT NOT NULL,
  item_state TEXT NOT NULL CHECK(item_state IN ('raw','graded','sealed','other')),
  condition_label TEXT,
  grading_company TEXT,
  grade_label TEXT,
  market_variant TEXT,
  notes TEXT,
  evidence_class TEXT NOT NULL,
  observation_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(owner_account_id, treasure_id, provider_id, provider_observation_id)
);
CREATE INDEX IF NOT EXISTS vault_provider_observation_owner_treasure_idx
  ON vault_valuation_provider_observations(owner_account_id, treasure_id, observed_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS vault_provider_observation_provider_idx
  ON vault_valuation_provider_observations(owner_account_id, provider_id, observed_date DESC);
CREATE INDEX IF NOT EXISTS vault_provider_observation_currency_idx
  ON vault_valuation_provider_observations(owner_account_id, currency, observed_date DESC);
`;

function mapObservation(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerAccountId: row.owner_account_id,
    treasureId: row.treasure_id,
    providerId: row.provider_id,
    providerName: row.provider_name,
    providerPolicyId: row.provider_policy_id,
    providerPolicyUrl: row.provider_policy_url,
    providerObservationId: row.provider_observation_id,
    providerItemReference: row.provider_item_reference,
    observationType: row.observation_type,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourceReference: row.source_reference,
    observedDate: row.observed_date,
    retrievedAt: row.retrieved_at,
    providerBuildAt: row.provider_build_at,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    itemState: row.item_state,
    conditionLabel: row.condition_label,
    gradingCompany: row.grading_company,
    gradeLabel: row.grade_label,
    marketVariant: row.market_variant,
    notes: row.notes,
    evidenceClass: row.evidence_class,
    observationSha256: row.observation_sha256,
    createdAt: row.created_at
  };
}

function boundedLimit(value, maximum = 2000) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) return 250;
  return Math.min(numeric, maximum);
}

export function createVaultValuationObservationRepository({ vaultStore } = {}) {
  const database = vaultStore?.database;
  if (!database || typeof database.prepare !== "function" || typeof database.exec !== "function") {
    throw new TypeError("Vault valuation observation repository requires the SqliteVaultStore database boundary.");
  }
  database.exec(SCHEMA);

  const insert = database.prepare(`
    INSERT INTO vault_valuation_provider_observations (
      id,owner_account_id,treasure_id,provider_id,provider_name,provider_policy_id,provider_policy_url,
      provider_observation_id,provider_item_reference,observation_type,source_name,source_url,source_reference,
      observed_date,retrieved_at,provider_build_at,amount_cents,currency,item_state,condition_label,
      grading_company,grade_label,market_variant,notes,evidence_class,observation_sha256,created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const find = database.prepare(`
    SELECT * FROM vault_valuation_provider_observations
    WHERE owner_account_id = ? AND id = ?
  `);
  const findProviderObservation = database.prepare(`
    SELECT * FROM vault_valuation_provider_observations
    WHERE owner_account_id = ? AND treasure_id = ? AND provider_id = ? AND provider_observation_id = ?
    LIMIT 1
  `);

  function create(observation) {
    insert.run(
      observation.id,
      observation.ownerAccountId,
      observation.treasureId,
      observation.providerId,
      observation.providerName,
      observation.providerPolicyId,
      observation.providerPolicyUrl ?? null,
      observation.providerObservationId,
      observation.providerItemReference ?? null,
      observation.observationType,
      observation.sourceName,
      observation.sourceUrl,
      observation.sourceReference ?? null,
      observation.observedDate,
      observation.retrievedAt,
      observation.providerBuildAt ?? null,
      observation.amountCents,
      observation.currency,
      observation.itemState,
      observation.conditionLabel ?? null,
      observation.gradingCompany ?? null,
      observation.gradeLabel ?? null,
      observation.marketVariant ?? null,
      observation.notes ?? null,
      observation.evidenceClass,
      observation.observationSha256,
      observation.createdAt
    );
    return findById(observation.ownerAccountId, observation.id);
  }

  function findById(ownerAccountId, id) {
    return mapObservation(find.get(ownerAccountId, id));
  }

  function findByProviderObservationId(ownerAccountId, treasureId, providerId, providerObservationId) {
    return mapObservation(findProviderObservation.get(ownerAccountId, treasureId, providerId, providerObservationId));
  }

  function listForTreasure(ownerAccountId, treasureId, { limit = 250 } = {}) {
    return database.prepare(`
      SELECT * FROM vault_valuation_provider_observations
      WHERE owner_account_id = ? AND treasure_id = ?
      ORDER BY observed_date DESC, created_at DESC, id DESC
      LIMIT ?
    `).all(ownerAccountId, treasureId, boundedLimit(limit)).map(mapObservation);
  }

  function listForOwner(ownerAccountId, { limit = 2000 } = {}) {
    return database.prepare(`
      SELECT * FROM vault_valuation_provider_observations
      WHERE owner_account_id = ?
      ORDER BY observed_date ASC, created_at ASC, id ASC
      LIMIT ?
    `).all(ownerAccountId, boundedLimit(limit, 10000)).map(mapObservation);
  }

  function countForOwner(ownerAccountId) {
    const row = database.prepare(`
      SELECT COUNT(*) AS count
      FROM vault_valuation_provider_observations
      WHERE owner_account_id = ?
    `).get(ownerAccountId);
    return Number(row?.count ?? 0);
  }

  return Object.freeze({
    create,
    findById,
    findByProviderObservationId,
    listForTreasure,
    listForOwner,
    countForOwner
  });
}
