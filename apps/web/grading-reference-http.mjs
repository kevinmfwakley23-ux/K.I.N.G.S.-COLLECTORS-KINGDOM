import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { GradingReferenceError } from "../../packages/grading/src/commons-autograph-provider.mjs";

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

function sendImage(response, statusCode, image, method, securityHeaders) {
  response.writeHead(statusCode, {
    ...securityHeaders,
    "Content-Type": image.contentType,
    "Content-Length": image.bytes.length,
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(method === "HEAD" ? undefined : image.bytes);
}

export async function handleGradingReferenceRoute({
  request,
  response,
  requestUrl,
  identityService,
  autographReferenceProvider,
  securityHeaders
} = {}) {
  const isSearch = requestUrl.pathname === "/api/grading/autograph-references";
  const isImage = requestUrl.pathname === "/api/grading/autograph-reference-image";
  if (!isSearch && !isImage) return null;

  const method = request.method ?? "GET";
  if (!["GET", "HEAD"].includes(method)) return false;
  requireIdentity(identityService, request);

  if (!autographReferenceProvider) {
    return sendJson(response, 503, {
      error: "grading_reference_unavailable",
      message: "Autograph web-reference lookup is unavailable. No authentication claim was made."
    }, method, securityHeaders);
  }

  try {
    if (isSearch) {
      const result = await autographReferenceProvider.searchSigner(requestUrl.searchParams.get("signer"));
      return sendJson(response, 200, { result }, method, securityHeaders);
    }

    const image = await autographReferenceProvider.fetchReferenceImage(requestUrl.searchParams.get("title"));
    return sendImage(response, 200, image, method, securityHeaders);
  } catch (error) {
    if (error instanceof GradingReferenceError) {
      const payload = { error: error.code, message: error.message, retryable: error.retryable };
      if (error.details) payload.details = error.details;
      return sendJson(response, error.statusCode, payload, method, securityHeaders);
    }
    throw error;
  }
}
