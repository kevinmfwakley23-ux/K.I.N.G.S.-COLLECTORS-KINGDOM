import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { VaultError } from "../../packages/vault/src/service.mjs";
import { renderInsurancePreparationReportHtml } from "./vault-report-html.mjs";

function requireIdentity(identityService, request) {
  const token = parseCookies(request.headers.cookie ?? "").kingdom_session ?? null;
  const identity = identityService?.authenticate(token);
  if (!identity) throw new IdentityError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanBooleanParam(value, label) {
  if (value === null || value === "") return false;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new VaultError(`invalid_${label}`, `${label} must be true or false.`);
}

function reportInput(searchParams) {
  return {
    collectionId: searchParams.get("collectionId") ?? undefined,
    treasureIds: searchParams.getAll("treasureId"),
    includeArchived: cleanBooleanParam(searchParams.get("includeArchived"), "include_archived")
  };
}

function sendJson(response, method, report, securityHeaders, { download = false } = {}) {
  const body = JSON.stringify(report, null, download ? 2 : 0);
  const headers = {
    ...securityHeaders,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache"
  };
  if (download) headers["Content-Disposition"] = `attachment; filename="kings-collection-evidence-${String(report.generatedAt).slice(0, 10)}.json"`;
  response.writeHead(200, headers);
  response.end(method === "HEAD" ? undefined : body);
}

function sendHtml(response, method, report, securityHeaders) {
  const body = renderInsurancePreparationReportHtml(report);
  response.writeHead(200, {
    ...securityHeaders,
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    "Content-Disposition": `inline; filename="kings-collection-evidence-${String(report.generatedAt).slice(0, 10)}.html"`
  });
  response.end(method === "HEAD" ? undefined : body);
}

export async function handleVaultReportRoute({
  request,
  response,
  requestUrl,
  identityService,
  vaultReportService,
  securityHeaders
} = {}) {
  if (requestUrl.pathname !== "/api/vault/reports/insurance-preparation") return null;
  const method = request.method ?? "GET";
  if (!["GET", "HEAD"].includes(method)) return false;
  if (!vaultReportService) throw new VaultError("vault_report_unavailable", "Collection evidence reporting is unavailable.", 503);

  const format = String(requestUrl.searchParams.get("format") ?? "json").toLowerCase();
  if (!new Set(["json", "html"]).has(format)) throw new VaultError("invalid_report_format", "format must be json or html.");
  const input = reportInput(requestUrl.searchParams);
  const identity = requireIdentity(identityService, request);
  const report = vaultReportService.generate(identity, input);
  if (format === "html") return sendHtml(response, method, report, securityHeaders);
  return sendJson(response, method, report, securityHeaders, { download: requestUrl.searchParams.get("download") === "true" });
}
