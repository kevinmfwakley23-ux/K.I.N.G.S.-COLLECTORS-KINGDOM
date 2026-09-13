import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { VaultError } from "../../packages/vault/src/service.mjs";
import { handleVaultPortfolioHistoryRoute } from "./vault-portfolio-history-http.mjs";

const MAX_VALUATION_JSON_BYTES = 16 * 1024;

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
  if (!contentType.startsWith("application/json")) {
    throw new VaultError("unsupported_media_type", "Content-Type must be application/json.", 415);
  }
  const announcedLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(announcedLength) && announcedLength > MAX_VALUATION_JSON_BYTES) {
    throw new VaultError("payload_too_large", "Valuation evidence request body may not exceed 16 KiB.", 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_VALUATION_JSON_BYTES) {
      throw new VaultError("payload_too_large", "Valuation evidence request body may not exceed 16 KiB.", 413);
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new VaultError("invalid_json", "Request body must contain valid JSON.");
  }
}

function valuationRoute(pathname) {
  const match = pathname.match(/^\/api\/vault\/treasures\/([^/]+)\/valuation(?:\/(evidence|provider-observations|explanation))?$/);
  if (!match) return null;
  try {
    return { treasureId: decodeURIComponent(match[1]), action: match[2] ?? null };
  } catch {
    throw new VaultError("invalid_treasure_id", "The treasure identifier is invalid.");
  }
}

export function augmentValuationExplanationWithHistory(explanation, snapshot) {
  if (!explanation || typeof explanation !== "object") throw new TypeError("Keeper valuation explanation is required.");
  const historyEntries = Array.isArray(snapshot?.history?.entries) ? snapshot.history.entries : [];
  const realizedSaleCitations = historyEntries
    .filter((entry) => entry?.kind === "realized-sale")
    .map((entry) => Object.freeze({
      sourceRecordType: entry.sourceRecordType,
      sourceRecordId: entry.sourceRecordId,
      date: entry.date,
      recordedAt: entry.recordedAt,
      priced: Boolean(entry.priced),
      amountCents: entry.amountCents ?? null,
      currency: entry.currency ?? null,
      method: entry.method ?? null,
      counterparty: entry.counterparty ?? null,
      sourceUrl: entry.sourceUrl ?? null,
      sourceReference: entry.sourceReference ?? null,
      evidenceClass: entry.evidenceClass ?? null,
      corrected: Boolean(entry.corrected),
      active: Boolean(entry.active),
      correctionIds: Object.freeze([...(entry.correctionIds ?? [])])
    }));

  if (!realizedSaleCitations.length) {
    return Object.freeze({
      ...explanation,
      realizedSaleCitations: Object.freeze([]),
      realizedSalesInfluenceEstimate: false
    });
  }

  const activeIds = realizedSaleCitations.filter((citation) => citation.active).map((citation) => citation.sourceRecordId);
  const correctedIds = realizedSaleCitations.filter((citation) => citation.corrected).map((citation) => citation.sourceRecordId);
  const sentences = [explanation.text];
  sentences.push(`Value history also cites realized-sale provenance record IDs ${realizedSaleCitations.map((citation) => citation.sourceRecordId).join(", ")}.`);
  if (activeIds.length) sentences.push(`Active realized-sale record IDs: ${activeIds.join(", ")}.`);
  if (correctedIds.length) sentences.push(`Corrected realized-sale record IDs remain visible for audit history: ${correctedIds.join(", ")}.`);
  sentences.push("Realized sales are collector lifecycle evidence and do not influence the current sold-comparable market estimate.");

  return Object.freeze({
    ...explanation,
    text: sentences.filter(Boolean).join(" "),
    realizedSaleCitations: Object.freeze(realizedSaleCitations),
    realizedSalesInfluenceEstimate: false
  });
}

export async function handleVaultValuationRoute({
  request,
  response,
  requestUrl,
  identityService,
  vaultValuationService,
  securityHeaders
} = {}) {
  if (requestUrl.pathname === "/api/vault/portfolio-history" || requestUrl.pathname.startsWith("/api/vault/portfolio-history/")) {
    return handleVaultPortfolioHistoryRoute({
      request,
      response,
      requestUrl,
      identityService,
      vaultPortfolioHistoryService: vaultValuationService?.portfolioHistoryService ?? null,
      securityHeaders
    });
  }

  const route = valuationRoute(requestUrl.pathname);
  if (!route) return null;
  if (!vaultValuationService) throw new VaultError("vault_valuation_unavailable", "The Vault valuation evidence service is unavailable.", 503);

  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);

  if (!route.action && (method === "GET" || method === "HEAD")) {
    return sendJson(response, 200, {
      snapshot: vaultValuationService.snapshot(identity, route.treasureId),
      evidence: vaultValuationService.list(identity, route.treasureId),
      evidenceTypes: vaultValuationService.evidenceTypes,
      itemStates: vaultValuationService.itemStates
    }, method, securityHeaders);
  }

  if (route.action === "explanation" && (method === "GET" || method === "HEAD")) {
    const snapshot = vaultValuationService.snapshot(identity, route.treasureId);
    const explanation = vaultValuationService.explain(identity, route.treasureId, {
      bucketKey: requestUrl.searchParams.get("bucketKey") ?? undefined
    });
    return sendJson(response, 200, {
      explanation: augmentValuationExplanationWithHistory(explanation, snapshot)
    }, method, securityHeaders);
  }

  if (route.action === "evidence" && method === "POST") {
    const body = await readJson(request);
    const evidence = vaultValuationService.append(identity, route.treasureId, {
      evidenceType: body.evidenceType,
      sourceName: body.sourceName,
      sourceUrl: body.sourceUrl,
      sourceReference: body.sourceReference,
      observedDate: body.observedDate,
      amountCents: body.amountCents,
      currency: body.currency,
      itemState: body.itemState,
      conditionLabel: body.conditionLabel,
      gradingCompany: body.gradingCompany,
      gradeLabel: body.gradeLabel,
      notes: body.notes,
      correctsEvidenceId: body.correctsEvidenceId
    });
    return sendJson(response, 201, {
      evidence,
      snapshot: vaultValuationService.snapshot(identity, route.treasureId)
    }, method, securityHeaders);
  }

  if (route.action === "provider-observations" && method === "POST") {
    const body = await readJson(request);
    const refresh = await vaultValuationService.refreshProviderObservations(identity, route.treasureId, {
      providerId: body.providerId,
      limit: body.limit
    });
    return sendJson(response, 200, {
      refresh,
      snapshot: vaultValuationService.snapshot(identity, route.treasureId),
      evidence: vaultValuationService.list(identity, route.treasureId)
    }, method, securityHeaders);
  }

  return false;
}
