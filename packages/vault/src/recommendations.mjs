import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { VaultError } from "./service.mjs";

const MAX_RECOMMENDATIONS = 12;

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function recommendationLimit(value) {
  if (value === undefined) return 6;
  if (!Number.isInteger(value) || value < 1 || value > MAX_RECOMMENDATIONS) {
    throw new VaultError("invalid_tag_recommendation_limit", `Tag recommendation limit must be an integer between 1 and ${MAX_RECOMMENDATIONS}.`);
  }
  return value;
}

function strength(row) {
  const peers = Number(row.peer_count ?? 0);
  const seriesPeers = Number(row.series_peer_count ?? 0);
  const makerPeers = Number(row.manufacturer_peer_count ?? 0);
  if (peers >= 4 || seriesPeers >= 3) return "strong";
  if (peers >= 2 || seriesPeers >= 2 || makerPeers >= 2) return "moderate";
  return "tentative";
}

function explanation(row, category) {
  const peers = Number(row.peer_count ?? 0);
  const seriesPeers = Number(row.series_peer_count ?? 0);
  const makerPeers = Number(row.manufacturer_peer_count ?? 0);
  const yearPeers = Number(row.year_peer_count ?? 0);
  const parts = [`used on ${peers} other ${category} ${peers === 1 ? "treasure" : "treasures"} in your Vault`];
  if (seriesPeers) parts.push(`${seriesPeers} share the same series`);
  if (makerPeers) parts.push(`${makerPeers} share the same publisher/manufacturer`);
  if (yearPeers) parts.push(`${yearPeers} share the same year`);
  return `${parts.join("; ")}.`;
}

export function createVaultRecommendationService({ filename } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault recommendation database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA busy_timeout = 5000;");

  const targetStatement = database.prepare(`SELECT id, account_id, title, category, series, manufacturer, year
    FROM vault_treasures WHERE account_id = ? AND id = ?`);

  const recommendationStatement = database.prepare(`SELECT
      tg.tag AS tag,
      COUNT(DISTINCT peer.id) AS peer_count,
      SUM(4
        + CASE WHEN ? IS NOT NULL AND peer.series = ? COLLATE NOCASE THEN 3 ELSE 0 END
        + CASE WHEN ? IS NOT NULL AND peer.manufacturer = ? COLLATE NOCASE THEN 2 ELSE 0 END
        + CASE WHEN ? IS NOT NULL AND peer.year = ? THEN 1 ELSE 0 END
      ) AS weighted_support,
      SUM(CASE WHEN ? IS NOT NULL AND peer.series = ? COLLATE NOCASE THEN 1 ELSE 0 END) AS series_peer_count,
      SUM(CASE WHEN ? IS NOT NULL AND peer.manufacturer = ? COLLATE NOCASE THEN 1 ELSE 0 END) AS manufacturer_peer_count,
      SUM(CASE WHEN ? IS NOT NULL AND peer.year = ? THEN 1 ELSE 0 END) AS year_peer_count
    FROM vault_treasures peer
    JOIN vault_tags tg ON tg.treasure_id = peer.id
    WHERE peer.account_id = ?
      AND peer.id <> ?
      AND peer.category = ? COLLATE NOCASE
      AND NOT EXISTS (
        SELECT 1 FROM vault_tags own
        WHERE own.treasure_id = ? AND own.tag = tg.tag COLLATE NOCASE
      )
    GROUP BY tg.tag
    ORDER BY weighted_support DESC, peer_count DESC, tg.tag COLLATE NOCASE ASC
    LIMIT ?`);

  function recommendTags(identity, treasureId, { limit } = {}) {
    const collector = requireIdentity(identity);
    const id = String(treasureId ?? "");
    const target = targetStatement.get(collector.id, id);
    if (!target) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    const safeLimit = recommendationLimit(limit);

    const rows = recommendationStatement.all(
      target.series, target.series,
      target.manufacturer, target.manufacturer,
      target.year, target.year,
      target.series, target.series,
      target.manufacturer, target.manufacturer,
      target.year, target.year,
      collector.id,
      target.id,
      target.category,
      target.id,
      safeLimit
    );

    return Object.freeze(rows.map((row) => Object.freeze({
      tag: String(row.tag),
      basis: "collector-vault-pattern",
      strength: strength(row),
      peerCount: Number(row.peer_count ?? 0),
      weightedSupport: Number(row.weighted_support ?? 0),
      signals: Object.freeze({
        sameSeriesPeers: Number(row.series_peer_count ?? 0),
        sameManufacturerPeers: Number(row.manufacturer_peer_count ?? 0),
        sameYearPeers: Number(row.year_peer_count ?? 0)
      }),
      explanation: explanation(row, target.category)
    })));
  }

  function close() {
    database.close();
  }

  return Object.freeze({
    recommendTags,
    close,
    maximumRecommendations: MAX_RECOMMENDATIONS,
    policy: Object.freeze({
      source: "authenticated-collector-vault-only",
      automaticApplication: false,
      crossCollectorLearning: false,
      modelGenerated: false
    })
  });
}
