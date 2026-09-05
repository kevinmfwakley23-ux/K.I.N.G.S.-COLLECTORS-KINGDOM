const LOCATION_TYPES = Object.freeze([
  "room",
  "vault",
  "safe",
  "cabinet",
  "display-case",
  "shelf",
  "binder",
  "page",
  "pocket",
  "box",
  "row",
  "divider",
  "custom"
]);

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function locationTypes() {
  return LOCATION_TYPES.slice();
}

export function descendantLocationIds(locations, locationId) {
  const children = new Map();
  for (const location of Array.isArray(locations) ? locations : []) {
    const parentId = location?.parentId ?? null;
    if (!parentId) continue;
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(location.id);
  }

  const descendants = new Set();
  const queue = [...(children.get(locationId) ?? [])];
  while (queue.length) {
    const id = queue.shift();
    if (!id || descendants.has(id)) continue;
    descendants.add(id);
    queue.push(...(children.get(id) ?? []));
  }
  return descendants;
}

export function eligibleLocationParents(locations, currentLocationId) {
  const blocked = descendantLocationIds(locations, currentLocationId);
  blocked.add(currentLocationId);
  return (Array.isArray(locations) ? locations : [])
    .filter((location) => location?.id && !blocked.has(location.id))
    .slice()
    .sort((left, right) => String(left.path ?? left.name ?? "").localeCompare(String(right.path ?? right.name ?? "")));
}

export function collectionPatch(original, draft) {
  if (!original?.id) throw new TypeError("A saved collection is required.");
  const name = cleanText(draft?.name);
  if (!name) throw new TypeError("Collection name is required.");
  const description = cleanText(draft?.description);
  const patch = {};
  if (name !== cleanText(original.name)) patch.name = name;
  if (description !== cleanText(original.description)) patch.description = description || null;
  return patch;
}

export function locationPatch(original, draft) {
  if (!original?.id) throw new TypeError("A saved location is required.");
  const name = cleanText(draft?.name);
  if (!name) throw new TypeError("Location name is required.");
  const locationType = cleanText(draft?.locationType).toLowerCase();
  if (!LOCATION_TYPES.includes(locationType)) throw new TypeError("Choose a supported location type.");
  const notes = cleanText(draft?.notes);
  const parentId = cleanText(draft?.parentId) || null;
  const patch = {};
  if (name !== cleanText(original.name)) patch.name = name;
  if (locationType !== cleanText(original.locationType).toLowerCase()) patch.locationType = locationType;
  if (notes !== cleanText(original.notes)) patch.notes = notes || null;
  if (parentId !== (original.parentId ?? null)) patch.parentId = parentId;
  return patch;
}

export function hasChanges(patch) {
  return Boolean(patch && typeof patch === "object" && Object.keys(patch).length);
}

export function branchMoveNotice(location, selectedParent) {
  const destination = selectedParent?.path ?? selectedParent?.name ?? "top level";
  const source = location?.path ?? location?.name ?? "this location";
  return `Move ${source} under ${destination}. Descendant locations move with the branch; permanent treasure IDs stay unchanged.`;
}
