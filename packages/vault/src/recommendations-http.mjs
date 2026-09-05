import { VaultError } from "./service.mjs";

function intParam(searchParams, name, fallback) {
  const raw = searchParams.get(name);
  if (raw === null || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) throw new VaultError(`invalid_${name}`, `${name} must be an integer.`);
  return value;
}

export function handleVaultRecommendationRequest({
  request,
  pathname,
  searchParams,
  identity,
  recommendationService
} = {}) {
  const match = pathname.match(/^\/api\/vault\/treasures\/([^/]+)\/tag-recommendations$/);
  if (!match) return false;
  if (!recommendationService?.recommendTags) {
    throw new VaultError("tag_recommendations_unavailable", "Royal Curator tag recommendations are unavailable.", 503);
  }
  if ((request.method ?? "GET") !== "GET") return null;
  const treasureId = decodeURIComponent(match[1]);
  const limit = intParam(searchParams, "limit", 6);
  return {
    status: 200,
    payload: {
      recommendations: recommendationService.recommendTags(identity, treasureId, { limit }),
      policy: recommendationService.policy,
      maximumRecommendations: recommendationService.maximumRecommendations
    }
  };
}
