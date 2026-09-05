import { VaultError } from "./service.mjs";

function intParam(searchParams, name, fallback) {
  const raw = searchParams.get(name);
  if (raw === null || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) throw new VaultError(`invalid_${name}`, `${name} must be an integer.`);
  return value;
}

export function handleVaultImprovementRequest({
  request,
  pathname,
  searchParams,
  identity,
  improvementService
} = {}) {
  if (pathname !== "/api/vault/improvements") return false;
  if (!improvementService?.list) {
    throw new VaultError("collection_improvements_unavailable", "Royal Curator collection improvements are unavailable.", 503);
  }
  if ((request.method ?? "GET") !== "GET") return null;
  const limit = intParam(searchParams, "limit", 6);
  return {
    status: 200,
    payload: {
      improvements: improvementService.list(identity, { limit }),
      policy: improvementService.policy,
      maximumImprovements: improvementService.maximumImprovements
    }
  };
}
