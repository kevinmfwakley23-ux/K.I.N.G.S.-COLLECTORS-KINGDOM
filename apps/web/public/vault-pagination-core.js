export function buildPagedVaultQuery(filters = {}, { cursor = null, pageSize = 50 } = {}) {
  const params = new URLSearchParams();
  const mappings = [
    ["query", "q"],
    ["category", "category"],
    ["collectionId", "collectionId"],
    ["locationId", "locationId"],
    ["condition", "condition"],
    ["sort", "sort"],
    ["order", "order"]
  ];
  for (const [source, target] of mappings) {
    const value = filters[source];
    if (value !== undefined && value !== null && String(value).trim() !== "") params.set(target, String(value));
  }
  if (filters.includeArchived === true) params.set("includeArchived", "true");
  params.set("pageSize", String(pageSize));
  if (cursor) params.set("cursor", String(cursor));
  return params.toString();
}

export function mergeTreasurePage(current, incoming, { append = false } = {}) {
  const source = append ? [...(Array.isArray(current) ? current : []), ...(Array.isArray(incoming) ? incoming : [])] : [...(Array.isArray(incoming) ? incoming : [])];
  const seen = new Set();
  const result = [];
  for (const treasure of source) {
    if (!treasure?.id || seen.has(treasure.id)) continue;
    seen.add(treasure.id);
    result.push(treasure);
  }
  return result;
}

export function loadedResultLabel(count, hasNext) {
  const loaded = Number.isInteger(count) && count >= 0 ? count : 0;
  return `${loaded} loaded result${loaded === 1 ? "" : "s"}${hasNext ? " • more available" : ""}`;
}
