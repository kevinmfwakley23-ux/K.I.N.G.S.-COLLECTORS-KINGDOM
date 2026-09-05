import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { VaultError } from "../../packages/vault/src/service.mjs";

const MAX_PRE_GRADE_JSON_BYTES = 128 * 1024;

function requireIdentity(identityService, request) {
  const token = parseCookies(request.headers.cookie ?? "").kingdom_session ?? null;
  const identity = identityService?.authenticate(token);
  if (!identity) throw new IdentityError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function sendJson(response, statusCode, payload, method, securityHeaders) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    ...securityHeaders,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "private, no-store, max-age=0"
  });
  response.end(method === "HEAD" ? undefined : body);
}

async function readJson(request) {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw new VaultError("unsupported_media_type", "Content-Type must be application/json.", 415);
  const announced = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(announced) && announced > MAX_PRE_GRADE_JSON_BYTES) throw new VaultError("payload_too_large", "Pre-grade analysis request may not exceed 128 KiB.", 413);
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_PRE_GRADE_JSON_BYTES) throw new VaultError("payload_too_large", "Pre-grade analysis request may not exceed 128 KiB.", 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { throw new VaultError("invalid_json", "Request body must contain valid JSON."); }
}

function route(pathname) {
  const match = pathname.match(/^\/api\/grading\/treasures\/([^/]+)\/pregrade-analyses$/);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); }
  catch { throw new VaultError("invalid_treasure_id", "The treasure identifier is invalid."); }
}

export async function handleGradingAnalysisRoute({
  request,
  response,
  requestUrl,
  identityService,
  gradingAnalysisService,
  securityHeaders
} = {}) {
  const treasureId = route(requestUrl.pathname);
  if (!treasureId) return null;
  if (!gradingAnalysisService) throw new VaultError("pregrade_analysis_unavailable", "Stored pre-grade analysis is unavailable.", 503);
  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);

  if (method === "GET" || method === "HEAD") {
    const limitRaw = requestUrl.searchParams.get("limit");
    const limit = limitRaw === null ? undefined : Number(limitRaw);
    return sendJson(response, 200, {
      analyses: gradingAnalysisService.list(identity, treasureId, { limit }),
      policy: {
        appendOnly: true,
        ordinaryUpdateAvailable: false,
        ordinaryDeleteAvailable: false,
        advisoryOnly: true,
        computationAuthority: "client-computed-advisory-not-server-recomputed",
        independentlyVerified: false,
        officialGrade: false,
        physicalAuthentication: false,
        mutatesAuthoritativeCondition: false,
        mutatesValue: false
      }
    }, method, securityHeaders);
  }

  if (method === "POST") {
    const body = await readJson(request);
    const analysis = gradingAnalysisService.append(identity, treasureId, {
      standardProfile: body.standardProfile,
      cardSizeProfile: body.cardSizeProfile,
      sourceMediaIds: body.sourceMediaIds,
      centering: body.centering,
      captureQuality: body.captureQuality,
      detectorCoverage: body.detectorCoverage,
      defects: body.defects,
      autographComparison: body.autographComparison,
      estimatedGradeRange: body.estimatedGradeRange,
      limitations: body.limitations
    });
    return sendJson(response, 201, { analysis }, method, securityHeaders);
  }

  return false;
}
