import { createHash, randomUUID } from "node:crypto";
import { VaultError } from "./service.mjs";

const PREVIEW_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_IMPORT_RECORDS = 1000;

function requireCollector(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanBatchId(value) {
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value.trim())) {
    throw new VaultError("invalid_import_batch_id", "A valid import batch identifier is required.");
  }
  return value.trim();
}

function cleanSourceLabel(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError("invalid_import_source", "Import source label must be text.");
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 120) throw new VaultError("invalid_import_source", "Import source label must contain 1 to 120 characters.");
  return cleaned;
}

function cleanIdempotencyKey(value) {
  if (typeof value !== "string") throw new VaultError("missing_idempotency_key", "An idempotency key is required for import commit.");
  const cleaned = value.trim();
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(cleaned)) {
    throw new VaultError("invalid_idempotency_key", "Idempotency key must contain 8 to 128 safe characters.");
  }
  return cleaned;
}

function normalizedSearchText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hashParts(parts) {
  const value = parts.filter(Boolean).join("|");
  return value ? createHash("sha256").update(value).digest("hex") : null;
}

function identifierFingerprint(externalIdentifiers = {}) {
  const pairs = Object.entries(externalIdentifiers)
    .map(([key, value]) => `${normalizedSearchText(key)}=${normalizedSearchText(value)}`)
    .filter((entry) => !entry.endsWith("="))
    .sort();
  return hashParts(pairs);
}

function contentFingerprint(treasure) {
  return hashParts([
    normalizedSearchText(treasure.title),
    normalizedSearchText(treasure.category),
    normalizedSearchText(treasure.manufacturer),
    normalizedSearchText(treasure.series),
    normalizedSearchText(treasure.variant)
  ]);
}

function searchText(treasure) {
  return normalizedSearchText([
    treasure.title,
    treasure.category,
    treasure.description,
    treasure.manufacturer,
    treasure.series,
    treasure.variant,
    treasure.condition,
    treasure.conditionNotes,
    treasure.notes,
    JSON.stringify(treasure.externalIdentifiers ?? {}),
    JSON.stringify(treasure.attributes ?? {})
  ].filter(Boolean).join(" "));
}

function payloadHash(records) {
  return createHash("sha256").update(JSON.stringify(records)).digest("hex");
}

function decisionFingerprint(actions) {
  const canonical = [...actions.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, action]) => `${index}:${action}`)
    .join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

function existingDuplicateDescriptors(vaultStore, ownerAccountId, row) {
  return vaultStore.findDuplicateCandidates(ownerAccountId, {
    excludeId: "",
    identifierFingerprint: row.identifierFingerprint,
    contentFingerprint: row.contentFingerprint,
    limit: 20
  }).map((candidate) => {
    const identifierMatch = Boolean(row.identifierFingerprint && candidate.identifierFingerprint === row.identifierFingerprint);
    const contentMatch = candidate.contentFingerprint === row.contentFingerprint;
    return Object.freeze({
      kind: "existing",
      treasureId: candidate.id,
      title: candidate.title,
      category: candidate.category,
      variant: candidate.variant,
      condition: candidate.condition,
      signals: Object.freeze([
        ...(identifierMatch ? ["external-identifier-match"] : []),
        ...(contentMatch ? ["normalized-content-match"] : [])
      ]),
      confidence: identifierMatch ? "high" : "review"
    });
  });
}

function addWithinBatchDuplicates(rows) {
  const identifierRows = new Map();
  const contentRows = new Map();

  for (const row of rows) {
    if (!row.normalized) continue;
    if (row.identifierFingerprint) {
      const indexes = identifierRows.get(row.identifierFingerprint) ?? [];
      indexes.push(row.index);
      identifierRows.set(row.identifierFingerprint, indexes);
    }
    if (row.contentFingerprint) {
      const indexes = contentRows.get(row.contentFingerprint) ?? [];
      indexes.push(row.index);
      contentRows.set(row.contentFingerprint, indexes);
    }
  }

  for (const row of rows) {
    if (!row.normalized) continue;
    const related = new Map();
    for (const index of identifierRows.get(row.identifierFingerprint) ?? []) {
      if (index !== row.index) related.set(index, new Set(["external-identifier-match"]));
    }
    for (const index of contentRows.get(row.contentFingerprint) ?? []) {
      if (index === row.index) continue;
      const signals = related.get(index) ?? new Set();
      signals.add("normalized-content-match");
      related.set(index, signals);
    }
    for (const [index, signals] of related) {
      row.duplicates.push(Object.freeze({
        kind: "batch",
        rowIndex: index,
        signals: Object.freeze([...signals]),
        confidence: signals.has("external-identifier-match") ? "high" : "review"
      }));
    }
    if (row.duplicates.length) row.status = "review";
  }
}

function publicRow(row) {
  return Object.freeze({
    index: row.index,
    status: row.status,
    treasure: row.normalized,
    error: row.error,
    duplicates: row.duplicates,
    committedTreasureId: row.committedTreasureId ?? null
  });
}

function publicBatch(batch, rows, { idempotentReplay = false } = {}) {
  return Object.freeze({
    id: batch.id,
    status: batch.status,
    sourceLabel: batch.sourceLabel,
    recordCount: batch.recordCount,
    acceptedCount: batch.acceptedCount,
    rejectedCount: batch.rejectedCount,
    reviewCount: batch.reviewCount,
    createdAt: batch.createdAt,
    expiresAt: batch.expiresAt,
    committedAt: batch.committedAt,
    commitResult: batch.commitResult,
    idempotentReplay,
    rows: Object.freeze(rows.map(publicRow))
  });
}

function isExpired(batch, now) {
  return batch.status === "preview" && new Date(batch.expiresAt).getTime() <= now.getTime();
}

function buildActions(rows, decisions) {
  if (decisions !== undefined && !Array.isArray(decisions)) {
    throw new VaultError("invalid_import_decisions", "Import decisions must be an array.");
  }
  const supplied = new Map();
  for (const decision of decisions ?? []) {
    const index = Number(decision?.index);
    const action = decision?.action;
    if (!Number.isInteger(index) || index < 0 || !["import", "skip"].includes(action)) {
      throw new VaultError("invalid_import_decision", "Each import decision needs a valid row index and import/skip action.");
    }
    if (supplied.has(index)) throw new VaultError("duplicate_import_decision", `Import row ${index} has more than one decision.`);
    supplied.set(index, action);
  }

  const knownIndexes = new Set(rows.map((row) => row.index));
  for (const index of supplied.keys()) {
    if (!knownIndexes.has(index)) throw new VaultError("unknown_import_row", `Import row ${index} is not part of this batch.`);
  }

  const actions = new Map();
  for (const row of rows) {
    const explicit = supplied.get(row.index);
    if (row.status === "rejected") {
      if (explicit === "import") throw new VaultError("rejected_import_row", `Rejected row ${row.index} cannot be imported without a corrected preview.`);
      actions.set(row.index, "skip");
      continue;
    }
    if (row.status === "review" && explicit === undefined) {
      throw new VaultError("duplicate_review_required", `Row ${row.index} has duplicate signals and requires an explicit import or skip decision.`, 409);
    }
    actions.set(row.index, explicit ?? "import");
  }
  return actions;
}

function existingDuplicateIds(duplicates) {
  return new Set((duplicates ?? []).filter((duplicate) => duplicate.kind === "existing").map((duplicate) => duplicate.treasureId));
}

export function createVaultImportService({ vaultService, vaultStore, importRepository, now = () => new Date() } = {}) {
  if (!vaultService) throw new TypeError("Vault import service requires the Vault service.");
  if (!vaultStore) throw new TypeError("Vault import service requires the Vault store.");
  if (!importRepository) throw new TypeError("Vault import service requires an import repository.");

  function expireIfNeeded(ownerAccountId, batch) {
    const currentTime = now();
    if (!batch || !isExpired(batch, currentTime)) return batch;
    importRepository.markExpired(ownerAccountId, batch.id);
    return importRepository.findBatch(ownerAccountId, batch.id);
  }

  function preview(identity, input = {}) {
    const collector = requireCollector(identity);
    if (!Array.isArray(input.records)) throw new VaultError("invalid_import", "Import preview requires a records array.");
    if (input.records.length < 1 || input.records.length > MAX_IMPORT_RECORDS) {
      throw new VaultError("invalid_import", `Import preview supports 1 to ${MAX_IMPORT_RECORDS} treasure records at a time.`);
    }

    const sourceLabel = cleanSourceLabel(input.sourceLabel);
    const validation = vaultService.previewImport(collector, { records: input.records });
    const acceptedByIndex = new Map(validation.accepted.map((entry) => [entry.index, entry.treasure]));
    const rejectedByIndex = new Map(validation.rejected.map((entry) => [entry.index, { code: entry.code, message: entry.message }]));
    const rows = [];

    for (let index = 0; index < input.records.length; index += 1) {
      const normalized = acceptedByIndex.get(index) ?? null;
      if (!normalized) {
        rows.push({
          index,
          status: "rejected",
          normalized: null,
          error: rejectedByIndex.get(index) ?? { code: "invalid_import_row", message: "This row could not be validated." },
          duplicates: [],
          identifierFingerprint: null,
          contentFingerprint: null,
          searchText: null
        });
        continue;
      }

      const row = {
        index,
        status: "ready",
        normalized,
        error: null,
        duplicates: [],
        identifierFingerprint: identifierFingerprint(normalized.externalIdentifiers),
        contentFingerprint: contentFingerprint(normalized),
        searchText: searchText(normalized)
      };
      row.duplicates.push(...existingDuplicateDescriptors(vaultStore, collector.id, row));
      if (row.duplicates.length) row.status = "review";
      rows.push(row);
    }

    addWithinBatchDuplicates(rows);
    const timestamp = now();
    const batch = importRepository.createBatch({
      id: randomUUID(),
      ownerAccountId: collector.id,
      sourceLabel,
      payloadHash: payloadHash(input.records),
      recordCount: rows.length,
      acceptedCount: rows.filter((row) => row.status !== "rejected").length,
      rejectedCount: rows.filter((row) => row.status === "rejected").length,
      reviewCount: rows.filter((row) => row.status === "review").length,
      createdAt: timestamp.toISOString(),
      expiresAt: new Date(timestamp.getTime() + PREVIEW_TTL_MS).toISOString()
    }, rows);

    return publicBatch(batch, importRepository.listRows(collector.id, batch.id));
  }

  function get(identity, batchId) {
    const collector = requireCollector(identity);
    const id = cleanBatchId(batchId);
    const batch = expireIfNeeded(collector.id, importRepository.findBatch(collector.id, id));
    if (!batch) throw new VaultError("import_batch_not_found", "The requested import batch does not exist.", 404);
    return publicBatch(batch, importRepository.listRows(collector.id, id));
  }

  function commit(identity, batchId, input = {}) {
    const collector = requireCollector(identity);
    const id = cleanBatchId(batchId);
    const idempotencyKey = cleanIdempotencyKey(input.idempotencyKey);
    let batch = expireIfNeeded(collector.id, importRepository.findBatch(collector.id, id));
    if (!batch) throw new VaultError("import_batch_not_found", "The requested import batch does not exist.", 404);
    if (batch.status === "expired") throw new VaultError("import_batch_expired", "This import preview expired. Create a fresh preview before importing.", 410);
    if (batch.status === "cancelled") throw new VaultError("import_batch_cancelled", "This import batch was cancelled and cannot be committed.", 409);

    const rows = importRepository.listRows(collector.id, id);
    const actions = buildActions(rows, input.decisions);
    const fingerprint = decisionFingerprint(actions);

    if (batch.status === "committed") {
      if (batch.decisionFingerprint !== fingerprint) {
        throw new VaultError("import_batch_already_committed", "This import batch was already committed with a different row decision set.", 409);
      }
      return publicBatch(batch, rows, { idempotentReplay: true });
    }

    const reused = importRepository.findByIdempotencyKey(collector.id, idempotencyKey);
    if (reused && reused.id !== id) {
      throw new VaultError("idempotency_key_reused", "This idempotency key was already used for a different import batch.", 409);
    }

    const selectedRows = rows.filter((row) => actions.get(row.index) === "import");
    if (selectedRows.length) {
      const revalidation = vaultService.previewImport(collector, { records: selectedRows.map((row) => row.normalized) });
      if (revalidation.rejected.length) {
        throw new VaultError("import_preview_stale", "One or more selected rows no longer pass Vault validation. Create a fresh preview.", 409, revalidation.rejected);
      }
      for (const row of selectedRows) {
        const current = existingDuplicateDescriptors(vaultStore, collector.id, row);
        const reviewedIds = existingDuplicateIds(row.duplicates);
        const unreviewed = current.filter((candidate) => !reviewedIds.has(candidate.treasureId));
        if (unreviewed.length) {
          throw new VaultError("import_preview_stale_duplicates", `Row ${row.index} now has duplicate candidates that were not present during preview. Review a fresh preview before committing.`, 409, {
            rowIndex: row.index,
            candidates: unreviewed
          });
        }
      }
    }

    const timestamp = now().toISOString();
    const treasures = selectedRows.map((row) => ({
      id: randomUUID(),
      ownerAccountId: collector.id,
      ...row.normalized,
      searchText: row.searchText,
      identifierFingerprint: row.identifierFingerprint,
      contentFingerprint: row.contentFingerprint,
      createdAt: timestamp,
      updatedAt: timestamp,
      importRowIndex: row.index
    }));
    const events = treasures.map((treasure) => ({
      id: randomUUID(),
      ownerAccountId: collector.id,
      treasureId: treasure.id,
      eventType: "vault.treasure_imported",
      metadata: {
        sourceBatchId: id,
        sourceLabel: batch.sourceLabel,
        sourceRowIndex: treasure.importRowIndex,
        payloadHash: batch.payloadHash
      },
      createdAt: timestamp
    }));
    const commitResult = {
      batchId: id,
      status: "committed",
      committedAt: timestamp,
      importedCount: treasures.length,
      skippedCount: [...actions.values()].filter((action) => action === "skip").length,
      rejectedCount: batch.rejectedCount,
      treasures: treasures.map((treasure) => ({
        rowIndex: treasure.importRowIndex,
        id: treasure.id,
        title: treasure.title
      }))
    };

    const result = importRepository.commitBatch({
      ownerAccountId: collector.id,
      batchId: id,
      idempotencyKey,
      decisionFingerprint: fingerprint,
      committedAt: timestamp,
      treasures,
      events,
      commitResult
    });

    if (result.kind === "not_found") throw new VaultError("import_batch_not_found", "The requested import batch does not exist.", 404);
    if (result.kind === "expired") throw new VaultError("import_batch_expired", "This import preview expired before commit.", 410);
    if (result.kind === "cancelled") throw new VaultError("import_batch_cancelled", "This import batch was cancelled and cannot be committed.", 409);
    if (result.kind === "already_committed") {
      if (result.batch.decisionFingerprint !== fingerprint) {
        throw new VaultError("import_batch_already_committed", "This import batch was already committed with a different row decision set.", 409);
      }
      return publicBatch(result.batch, importRepository.listRows(collector.id, id), { idempotentReplay: true });
    }

    batch = result.batch;
    return publicBatch(batch, importRepository.listRows(collector.id, id));
  }

  return Object.freeze({ preview, get, commit });
}
