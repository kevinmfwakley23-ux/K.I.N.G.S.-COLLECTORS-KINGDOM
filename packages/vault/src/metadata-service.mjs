import { randomUUID } from "node:crypto";
import { VaultError } from "./service.mjs";
import { canonicalTagKey } from "./metadata-repository.mjs";

const MAX_TAGS = 40;
const MAX_TAG_LENGTH = 60;

function requireCollector(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value ?? {}, key);
}

export function cleanTreasureYear(value) {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 9999) {
    throw new VaultError("invalid_year", "year must be a whole number between 1 and 9999.");
  }
  return numeric;
}

export function cleanTreasureTags(value) {
  if (value === undefined || value === null || value === "") return Object.freeze([]);
  if (!Array.isArray(value)) throw new VaultError("invalid_tags", "tags must be an array of collector tag labels.");
  if (value.length > MAX_TAGS) throw new VaultError("invalid_tags", `A treasure may contain at most ${MAX_TAGS} tags.`);

  const seen = new Set();
  const tags = [];
  for (const raw of value) {
    if (typeof raw !== "string") throw new VaultError("invalid_tags", "Every tag must be text.");
    const label = raw.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!label || label.length > MAX_TAG_LENGTH) {
      throw new VaultError("invalid_tags", `Each tag must contain 1 to ${MAX_TAG_LENGTH} characters.`);
    }
    const key = canonicalTagKey(label);
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(label);
  }
  tags.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return Object.freeze(tags);
}

function metadataInput(input = {}, existing = null) {
  return Object.freeze({
    year: hasOwn(input, "year") ? cleanTreasureYear(input.year) : existing?.year ?? null,
    tags: hasOwn(input, "tags") ? cleanTreasureTags(input.tags) : Object.freeze([...(existing?.tags ?? [])])
  });
}

function mergeMetadata(treasure, metadata) {
  if (!treasure) return treasure;
  return Object.freeze({
    ...treasure,
    year: metadata?.year ?? null,
    tags: Object.freeze([...(metadata?.tags ?? [])])
  });
}

export function createVaultMetadataService({
  vaultService,
  vaultStore,
  metadataRepository,
  now = () => new Date()
} = {}) {
  if (!vaultService) throw new TypeError("Vault metadata service requires the core Vault service.");
  if (!vaultStore || typeof vaultStore.writeEvent !== "function") throw new TypeError("Vault metadata service requires the Vault store boundary.");
  if (!metadataRepository) throw new TypeError("Vault metadata service requires the metadata repository.");

  function audit(ownerAccountId, treasureId, eventType, metadata) {
    vaultStore.writeEvent({
      id: randomUUID(),
      ownerAccountId,
      treasureId,
      eventType,
      metadata,
      createdAt: now().toISOString()
    });
  }

  function metadataFor(ownerAccountId, treasureId) {
    return metadataRepository.find(ownerAccountId, treasureId) ?? Object.freeze({
      treasureId,
      ownerAccountId,
      year: null,
      tags: Object.freeze([]),
      updatedAt: null
    });
  }

  function createTreasure(identity, input = {}) {
    const collector = requireCollector(identity);
    const normalizedMetadata = metadataInput(input);
    const treasure = vaultService.createTreasure(collector, input);
    const saved = metadataRepository.upsert({
      ownerAccountId: collector.id,
      treasureId: treasure.id,
      year: normalizedMetadata.year,
      tags: normalizedMetadata.tags,
      updatedAt: now().toISOString()
    });
    if (saved.year !== null || saved.tags.length) {
      audit(collector.id, treasure.id, "treasure.metadata_recorded", { year: saved.year, tags: saved.tags });
    }
    return mergeMetadata(treasure, saved);
  }

  function getTreasure(identity, treasureId) {
    const collector = requireCollector(identity);
    return mergeMetadata(vaultService.getTreasure(collector, treasureId), metadataFor(collector.id, treasureId));
  }

  function listTreasures(identity, filters = {}) {
    const collector = requireCollector(identity);
    const treasures = vaultService.listTreasures(collector, filters);
    const metadata = metadataRepository.findMany(collector.id, treasures.map((item) => item.id));
    return treasures.map((item) => mergeMetadata(item, metadata.get(item.id)));
  }

  function updateTreasure(identity, treasureId, patch = {}) {
    const collector = requireCollector(identity);
    const existingTreasure = vaultService.getTreasure(collector, treasureId);
    const existingMetadata = metadataFor(collector.id, treasureId);
    const nextMetadata = metadataInput(patch, existingMetadata);
    const treasure = vaultService.updateTreasure(collector, treasureId, patch);
    const metadataChanged = nextMetadata.year !== existingMetadata.year || JSON.stringify(nextMetadata.tags) !== JSON.stringify(existingMetadata.tags);
    const saved = metadataChanged
      ? metadataRepository.upsert({
          ownerAccountId: collector.id,
          treasureId,
          year: nextMetadata.year,
          tags: nextMetadata.tags,
          updatedAt: now().toISOString()
        })
      : existingMetadata;
    if (metadataChanged) {
      audit(collector.id, treasureId, "treasure.metadata_updated", {
        previous: { year: existingMetadata.year, tags: existingMetadata.tags },
        current: { year: saved.year, tags: saved.tags },
        title: existingTreasure.title
      });
    }
    return mergeMetadata(treasure, saved);
  }

  function archiveTreasure(identity, treasureId) {
    const collector = requireCollector(identity);
    return mergeMetadata(vaultService.archiveTreasure(collector, treasureId), metadataFor(collector.id, treasureId));
  }

  function exportData(identity) {
    const collector = requireCollector(identity);
    const payload = vaultService.exportData(collector);
    const metadata = metadataRepository.findMany(collector.id, payload.treasures.map((item) => item.id));
    return Object.freeze({
      ...payload,
      schemaVersion: Math.max(Number(payload.schemaVersion ?? 1), 4),
      treasures: payload.treasures.map((item) => mergeMetadata(item, metadata.get(item.id))),
      metadataPolicy: Object.freeze({
        yearRange: "1-9999-or-null",
        maximumTagsPerTreasure: MAX_TAGS,
        maximumTagLength: MAX_TAG_LENGTH,
        tagComparison: "unicode-normalized-case-insensitive",
        permanentTreasureIdentityUnchanged: true
      })
    });
  }

  function previewImport(identity, input = {}) {
    const collector = requireCollector(identity);
    const preview = vaultService.previewImport(collector, input);
    const accepted = preview.accepted.map((entry) => {
      const source = input.records?.[entry.index] ?? {};
      return Object.freeze({
        ...entry,
        treasure: Object.freeze({
          ...entry.treasure,
          year: cleanTreasureYear(source.year),
          tags: cleanTreasureTags(source.tags)
        })
      });
    });
    return Object.freeze({ ...preview, accepted: Object.freeze(accepted) });
  }

  function snapshot(identity) {
    const collector = requireCollector(identity);
    const snapshot = vaultService.snapshot(collector);
    return Object.freeze({
      ...snapshot,
      treasureMetadata: Object.freeze({
        yearAvailable: true,
        tagsAvailable: true,
        indexedExactTagFilteringAvailable: true,
        tagManagementAvailable: true,
        maximumTagsPerTreasure: MAX_TAGS
      })
    });
  }

  function getMetadata(identity, treasureId) {
    const collector = requireCollector(identity);
    vaultService.getTreasure(collector, treasureId);
    const metadata = metadataFor(collector.id, treasureId);
    const { ownerAccountId: _ownerAccountId, ...publicMetadata } = metadata;
    return Object.freeze(publicMetadata);
  }

  function setMetadata(identity, treasureId, input = {}) {
    const collector = requireCollector(identity);
    const treasure = vaultService.getTreasure(collector, treasureId);
    const existing = metadataFor(collector.id, treasureId);
    const next = metadataInput(input, existing);
    const saved = metadataRepository.upsert({
      ownerAccountId: collector.id,
      treasureId,
      year: next.year,
      tags: next.tags,
      updatedAt: now().toISOString()
    });
    const changed = next.year !== existing.year || JSON.stringify(next.tags) !== JSON.stringify(existing.tags);
    if (changed) {
      audit(collector.id, treasureId, "treasure.metadata_updated", {
        previous: { year: existing.year, tags: existing.tags },
        current: { year: saved.year, tags: saved.tags },
        title: treasure.title
      });
    }
    const { ownerAccountId: _ownerAccountId, ...publicMetadata } = saved;
    return Object.freeze(publicMetadata);
  }

  function listTags(identity) {
    const collector = requireCollector(identity);
    return Object.freeze(metadataRepository.listTags(collector.id));
  }

  function exportMetadata(identity) {
    const collector = requireCollector(identity);
    return Object.freeze(metadataRepository.exportForOwner(collector.id).map((record) => Object.freeze({
      treasureId: record.treasureId,
      year: record.year,
      tags: record.tags,
      updatedAt: record.updatedAt
    })));
  }

  return Object.freeze({
    ...vaultService,
    createTreasure,
    getTreasure,
    listTreasures,
    updateTreasure,
    archiveTreasure,
    exportData,
    previewImport,
    snapshot,
    getMetadata,
    setMetadata,
    listTags,
    exportMetadata,
    cleanYear: cleanTreasureYear,
    cleanTags: cleanTreasureTags
  });
}
