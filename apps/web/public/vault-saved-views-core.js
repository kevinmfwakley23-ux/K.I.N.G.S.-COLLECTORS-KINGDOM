export function filterStateFromControls({ search, category, collectionId, locationId, sort } = {}) {
  const normalizedSort = String(sort || "updatedAt");
  return Object.freeze({
    query: String(search ?? "").trim() || null,
    category: String(category ?? "").trim() || null,
    collectionId: String(collectionId ?? "").trim() || null,
    locationId: String(locationId ?? "").trim() || null,
    condition: null,
    sort: normalizedSort,
    order: normalizedSort === "title" || normalizedSort === "category" ? "asc" : "desc",
    includeArchived: false
  });
}

export function savedViewSummary(view, { collectionNames = new Map(), locationNames = new Map() } = {}) {
  const filters = view?.filters ?? {};
  const parts = [];
  if (filters.query) parts.push(`Search: ${filters.query}`);
  if (filters.category) parts.push(`Category: ${filters.category}`);
  if (filters.collectionId) parts.push(`Collection: ${collectionNames.get(filters.collectionId) ?? "saved collection"}`);
  if (filters.locationId) parts.push(`Location: ${locationNames.get(filters.locationId) ?? "saved location"}`);
  if (filters.condition) parts.push(`Condition: ${filters.condition}`);
  parts.push(`Sort: ${filters.sort ?? "updatedAt"} ${filters.order ?? "desc"}`);
  if (filters.includeArchived) parts.push("Includes archived records");
  return parts.join(" • ");
}

export function nextViewName(baseName, existingNames) {
  const cleaned = String(baseName ?? "").trim();
  if (!cleaned) throw new TypeError("Saved view name is required.");
  const occupied = new Set((Array.isArray(existingNames) ? existingNames : []).map((value) => String(value).trim().toLowerCase()));
  if (!occupied.has(cleaned.toLowerCase())) return cleaned;
  for (let index = 2; index <= 99; index += 1) {
    const candidate = `${cleaned} ${index}`;
    if (!occupied.has(candidate.toLowerCase())) return candidate;
  }
  throw new TypeError("Choose a more distinctive saved view name.");
}
