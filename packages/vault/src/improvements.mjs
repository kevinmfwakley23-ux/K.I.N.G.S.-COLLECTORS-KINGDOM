import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { VaultError } from "./service.mjs";

const MAX_IMPROVEMENTS = 8;
const MAX_EXAMPLES = 3;

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function safeLimit(value) {
  if (value === undefined) return 6;
  if (!Number.isInteger(value) || value < 1 || value > MAX_IMPROVEMENTS) {
    throw new VaultError("invalid_improvement_limit", `Improvement limit must be an integer between 1 and ${MAX_IMPROVEMENTS}.`);
  }
  return value;
}

function tableExists(database, name) {
  return Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

function count(database, sql, ...values) {
  return Number(database.prepare(sql).get(...values)?.count ?? 0);
}

function examples(database, sql, ...values) {
  return database.prepare(sql).all(...values, MAX_EXAMPLES).map((row) => Object.freeze({
    id: String(row.id),
    title: String(row.title)
  }));
}

function recommendation({ id, priority, title, reason, affectedCount, examples: sample = [], action, scope = "vault-record-quality" }) {
  return Object.freeze({
    id,
    priority,
    title,
    reason,
    affectedCount,
    examples: Object.freeze(sample),
    action,
    scope,
    basis: "authenticated-collector-vault-state",
    automaticApplication: false
  });
}

export function createVaultImprovementService({ filename, setSummaryService = null, duplicateSummaryService = null } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault improvement database filename is required.");
  mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA busy_timeout = 5000;");

  function list(identity, { limit } = {}) {
    const collector = requireIdentity(identity);
    const safe = safeLimit(limit);
    const accountId = collector.id;
    const suggestions = [];

    const treasureCount = count(database, "SELECT COUNT(*) AS count FROM vault_treasures WHERE account_id = ?", accountId);
    if (!treasureCount) return Object.freeze([]);

    const missingLocations = count(database, `SELECT COUNT(*) AS count FROM vault_treasures
      WHERE account_id = ? AND location_id IS NULL`, accountId);
    if (missingLocations) suggestions.push(recommendation({
      id: "record-storage-location",
      priority: "high",
      title: "Record physical storage locations",
      reason: `${missingLocations} ${missingLocations === 1 ? "treasure has" : "treasures have"} no recorded physical location, which makes retrieval and stewardship harder.`,
      affectedCount: missingLocations,
      examples: examples(database, `SELECT id, title FROM vault_treasures
        WHERE account_id = ? AND location_id IS NULL ORDER BY updated_at DESC LIMIT ?`, accountId),
      action: "Assign a real room, safe, cabinet, shelf, binder, box, or other physical location to the affected treasures."
    }));

    const missingPhotos = count(database, `SELECT COUNT(*) AS count FROM vault_treasures t
      WHERE t.account_id = ? AND NOT EXISTS (
        SELECT 1 FROM vault_media m WHERE m.account_id = t.account_id AND m.treasure_id = t.id
      )`, accountId);
    if (missingPhotos) suggestions.push(recommendation({
      id: "add-item-photographs",
      priority: "high",
      title: "Add actual-item photographs",
      reason: `${missingPhotos} ${missingPhotos === 1 ? "treasure has" : "treasures have"} no protected Vault image. Photos strengthen identification, condition records, insurance evidence, and future Marketplace preparation.`,
      affectedCount: missingPhotos,
      examples: examples(database, `SELECT t.id, t.title FROM vault_treasures t
        WHERE t.account_id = ? AND NOT EXISTS (
          SELECT 1 FROM vault_media m WHERE m.account_id = t.account_id AND m.treasure_id = t.id
        ) ORDER BY t.updated_at DESC LIMIT ?`, accountId),
      action: "Photograph the actual collectible and upload at least one clear image."
    }));

    const missingCondition = count(database, `SELECT COUNT(*) AS count FROM vault_treasures
      WHERE account_id = ? AND (condition IS NULL OR trim(condition) = '')`, accountId);
    if (missingCondition) suggestions.push(recommendation({
      id: "record-condition",
      priority: "high",
      title: "Record condition",
      reason: `${missingCondition} ${missingCondition === 1 ? "treasure is" : "treasures are"} missing condition information. Condition is important for stewardship, valuation context, insurance, and future disclosures.`,
      affectedCount: missingCondition,
      examples: examples(database, `SELECT id, title FROM vault_treasures
        WHERE account_id = ? AND (condition IS NULL OR trim(condition) = '') ORDER BY updated_at DESC LIMIT ?`, accountId),
      action: "Record the collector-observed condition without presenting it as third-party grading."
    }));

    if (tableExists(database, "vault_treasure_attributes")) {
      const missingDetails = count(database, `SELECT COUNT(*) AS count FROM vault_treasures t
        WHERE t.account_id = ? AND NOT EXISTS (
          SELECT 1 FROM vault_treasure_attributes a WHERE a.account_id = t.account_id AND a.treasure_id = t.id
        )`, accountId);
      if (missingDetails) suggestions.push(recommendation({
        id: "add-category-details",
        priority: "medium",
        title: "Add category-specific details",
        reason: `${missingDetails} ${missingDetails === 1 ? "treasure has" : "treasures have"} no category-specific detail fields yet. Those details improve search, organization, Keeper context, and future catalog/provider matching.`,
        affectedCount: missingDetails,
        examples: examples(database, `SELECT t.id, t.title FROM vault_treasures t
          WHERE t.account_id = ? AND NOT EXISTS (
            SELECT 1 FROM vault_treasure_attributes a WHERE a.account_id = t.account_id AND a.treasure_id = t.id
          ) ORDER BY t.updated_at DESC LIMIT ?`, accountId),
        action: "Add the relevant player, character, set number, mint mark, artist, authenticator, variant, or other category-specific fields that are actually known."
      }));
    }

    if (tableExists(database, "vault_ownership_history")) {
      const missingProvenance = count(database, `SELECT COUNT(*) AS count FROM vault_treasures t
        WHERE t.account_id = ? AND NOT EXISTS (
          SELECT 1 FROM vault_ownership_history o WHERE o.account_id = t.account_id AND o.treasure_id = t.id
        )`, accountId);
      if (missingProvenance) suggestions.push(recommendation({
        id: "preserve-ownership-history",
        priority: "medium",
        title: "Preserve ownership and provenance history",
        reason: `${missingProvenance} ${missingProvenance === 1 ? "treasure has" : "treasures have"} no ownership/provenance event recorded. Even a simple acquisition record can preserve useful history.`,
        affectedCount: missingProvenance,
        examples: examples(database, `SELECT t.id, t.title FROM vault_treasures t
          WHERE t.account_id = ? AND NOT EXISTS (
            SELECT 1 FROM vault_ownership_history o WHERE o.account_id = t.account_id AND o.treasure_id = t.id
          ) ORDER BY t.updated_at DESC LIMIT ?`, accountId),
        action: "Record known acquisition, inheritance, gift, transfer, or sale history. Do not invent missing provenance."
      }));
    }

    if (tableExists(database, "vault_evidence")) {
      const evidenceCandidates = count(database, `SELECT COUNT(*) AS count FROM vault_treasures t
        WHERE t.account_id = ?
          AND (t.purchase_price_cents IS NOT NULL OR t.estimated_value_cents IS NOT NULL)
          AND NOT EXISTS (
            SELECT 1 FROM vault_evidence e WHERE e.account_id = t.account_id AND e.treasure_id = t.id
          )`, accountId);
      if (evidenceCandidates) suggestions.push(recommendation({
        id: "attach-supporting-evidence",
        priority: "medium",
        title: "Attach supporting evidence where you have it",
        reason: `${evidenceCandidates} valued or purchase-recorded ${evidenceCandidates === 1 ? "treasure has" : "treasures have"} no supporting evidence document attached.`,
        affectedCount: evidenceCandidates,
        examples: examples(database, `SELECT t.id, t.title FROM vault_treasures t
          WHERE t.account_id = ?
            AND (t.purchase_price_cents IS NOT NULL OR t.estimated_value_cents IS NOT NULL)
            AND NOT EXISTS (
              SELECT 1 FROM vault_evidence e WHERE e.account_id = t.account_id AND e.treasure_id = t.id
            ) ORDER BY t.updated_at DESC LIMIT ?`, accountId),
        action: "Attach receipts, appraisals, certificates, grading paperwork, insurance records, or other documents you genuinely possess. Uploaded evidence remains not independently checked unless a real verifier confirms it."
      }));
    }

    const incompleteSets = setSummaryService?.list
      ? setSummaryService.list(identity, { incompleteOnly: true, limit: 500 })
      : [];
    if (incompleteSets.length) {
      const missingUnits = incompleteSets.reduce((total, item) => total + Number(item.missingUnitCount ?? 0), 0);
      suggestions.push(recommendation({
        id: "review-incomplete-sets",
        priority: "medium",
        title: "Review incomplete collection sets",
        reason: `${incompleteSets.length} ${incompleteSets.length === 1 ? "set is" : "sets are"} incomplete with ${missingUnits} missing ${missingUnits === 1 ? "unit" : "units"} recorded across their checklists.`,
        affectedCount: incompleteSets.length,
        examples: incompleteSets.slice(0, MAX_EXAMPLES).map((item) => Object.freeze({ id: String(item.id), title: String(item.name) })),
        action: "Review the explicit missing-entry checklists. The Kingdom will not infer that a similarly named treasure fills a slot."
      }));
    }

    const duplicateGroups = duplicateSummaryService?.list ? duplicateSummaryService.list(identity) : [];
    if (duplicateGroups.length) suggestions.push(recommendation({
      id: "review-possible-duplicates",
      priority: "high",
      title: "Review possible duplicate records",
      reason: `${duplicateGroups.length} possible duplicate ${duplicateGroups.length === 1 ? "group needs" : "groups need"} collector review. Similar records may be legitimate separate copies, variants, conditions, or provenance histories.`,
      affectedCount: duplicateGroups.length,
      examples: duplicateGroups.slice(0, MAX_EXAMPLES).map((group) => Object.freeze({
        id: String(group.treasures?.[0]?.id ?? `duplicate-group-${group.count}`),
        title: String(group.treasures?.[0]?.title ?? "Possible duplicate group")
      })),
      action: "Compare the records and keep, edit, or remove them only after you decide they truly represent the same collectible record.",
      scope: "duplicate-review"
    }));

    if (tableExists(database, "vault_marketplace_preparation")) {
      const startedButIncomplete = count(database, `SELECT COUNT(*) AS count FROM vault_marketplace_preparation p
        JOIN vault_treasures t ON t.id = p.treasure_id AND t.account_id = p.account_id
        WHERE p.account_id = ? AND (
          p.description_draft IS NULL OR trim(p.description_draft) = '' OR
          p.condition_disclosure IS NULL OR trim(p.condition_disclosure) = '' OR
          t.condition IS NULL OR trim(t.condition) = '' OR
          NOT EXISTS (SELECT 1 FROM vault_media m WHERE m.account_id = t.account_id AND m.treasure_id = t.id)
        )`, accountId);
      if (startedButIncomplete) suggestions.push(recommendation({
        id: "finish-marketplace-preparation",
        priority: "low",
        title: "Finish Marketplace preparation you already started",
        reason: `${startedButIncomplete} ${startedButIncomplete === 1 ? "treasure has" : "treasures have"} a private Marketplace preparation record but still lack one or more handoff requirements.`,
        affectedCount: startedButIncomplete,
        examples: examples(database, `SELECT t.id, t.title FROM vault_marketplace_preparation p
          JOIN vault_treasures t ON t.id = p.treasure_id AND t.account_id = p.account_id
          WHERE p.account_id = ? AND (
            p.description_draft IS NULL OR trim(p.description_draft) = '' OR
            p.condition_disclosure IS NULL OR trim(p.condition_disclosure) = '' OR
            t.condition IS NULL OR trim(t.condition) = '' OR
            NOT EXISTS (SELECT 1 FROM vault_media m WHERE m.account_id = t.account_id AND m.treasure_id = t.id)
          ) ORDER BY t.updated_at DESC LIMIT ?`, accountId),
        action: "Finish the private description, condition disclosure, actual-item photo, and recorded condition needed for future Marketplace handoff. This does not publish a listing."
      }));
    }

    const order = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => (order[a.priority] - order[b.priority]) || (b.affectedCount - a.affectedCount) || a.title.localeCompare(b.title));
    return Object.freeze(suggestions.slice(0, safe));
  }

  function close() {
    database.close();
  }

  return Object.freeze({
    list,
    close,
    maximumImprovements: MAX_IMPROVEMENTS,
    policy: Object.freeze({
      source: "authenticated-collector-vault-state",
      automaticApplication: false,
      modelGenerated: false,
      crossCollectorLearning: false,
      unknownFactsInvented: false
    })
  });
}
