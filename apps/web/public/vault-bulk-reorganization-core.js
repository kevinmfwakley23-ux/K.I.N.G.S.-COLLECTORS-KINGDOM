export const BULK_DESTINATION_UNCHANGED = "unchanged";
export const BULK_DESTINATION_CLEAR = "clear";
export const MAX_BULK_REORGANIZATION_SELECTION = 100;

function cleanChoice(value, label) {
  if (typeof value !== "string") throw new TypeError(`${label} choice is invalid.`);
  const cleaned = value.trim();
  if (!cleaned) throw new TypeError(`${label} choice is invalid.`);
  return cleaned;
}

function destinationValue(choice, label) {
  const cleaned = cleanChoice(choice, label);
  if (cleaned === BULK_DESTINATION_UNCHANGED) return Object.freeze({ included: false, value: undefined });
  if (cleaned === BULK_DESTINATION_CLEAR) return Object.freeze({ included: true, value: null });
  if (!cleaned.startsWith("id:")) throw new TypeError(`${label} choice is invalid.`);
  const id = cleaned.slice(3).trim();
  if (!id) throw new TypeError(`${label} destination identifier is invalid.`);
  return Object.freeze({ included: true, value: id });
}

export function bulkDestinationFromChoices(collectionChoice, locationChoice) {
  const collection = destinationValue(collectionChoice, "Collection");
  const location = destinationValue(locationChoice, "Storage location");
  const destination = {};
  if (collection.included) destination.collectionId = collection.value;
  if (location.included) destination.locationId = location.value;
  if (!Object.keys(destination).length) {
    throw new TypeError("Choose a destination collection, storage location, or both before previewing the move.");
  }
  return destination;
}

export function selectionStatus(selectedIds, maximum = MAX_BULK_REORGANIZATION_SELECTION) {
  const values = selectedIds instanceof Set ? [...selectedIds] : Array.isArray(selectedIds) ? selectedIds : [];
  const unique = new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()));
  const count = unique.size;
  if (count === 0) {
    return Object.freeze({ count, valid: false, message: "Select at least one treasure." });
  }
  if (!Number.isInteger(maximum) || maximum < 1) throw new TypeError("Selection maximum must be a positive integer.");
  if (count > maximum) {
    return Object.freeze({ count, valid: false, message: `Select no more than ${maximum} treasures in one movement batch.` });
  }
  return Object.freeze({ count, valid: true, message: `${count} treasure${count === 1 ? "" : "s"} selected.` });
}

export function organizationSummary(organization) {
  const collection = organization?.collection?.name ?? "No collection";
  const location = organization?.location?.path ?? organization?.location?.name ?? "Physical location not recorded";
  return `${collection} • ${location}`;
}

export function previewRowSummary(row) {
  if (!row || row.status !== "ready" || !row.treasure) {
    return Object.freeze({
      title: "Unavailable treasure",
      before: "Unavailable",
      after: "Unavailable",
      changed: "Cannot move",
      error: row?.error?.message ?? "This selected treasure could not be validated."
    });
  }
  const changedFields = Array.isArray(row.changedFields) ? row.changedFields : [];
  return Object.freeze({
    title: row.treasure.title ?? row.treasure.id,
    before: organizationSummary(row.before),
    after: organizationSummary(row.after),
    changed: changedFields.length ? changedFields.join(" + ") : "No organization change",
    error: null
  });
}

export function createBulkIdempotencyKey(randomUuid) {
  const value = typeof randomUuid === "function" ? randomUuid() : "";
  if (typeof value !== "string" || !value.trim()) throw new TypeError("A UUID generator is required for bulk movement commit safety.");
  return `bulk-ui:${value.trim()}`;
}
