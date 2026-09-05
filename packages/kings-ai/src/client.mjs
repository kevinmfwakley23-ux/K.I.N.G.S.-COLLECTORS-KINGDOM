const DEFAULT_TIMEOUT_MS = 70_000;

function normalizeBaseUrl(value) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError("KINGS AI base URL is required.");
  const trimmed = value.trim().replace(/\/+$/, "");
  const parsed = new URL(trimmed);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new TypeError("KINGS AI base URL must use http or https.");
  return parsed.toString().replace(/\/$/, "");
}

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
}

export class KingsAiClientError extends Error {
  constructor(code, message, { statusCode = null, retryable = false, details = null } = {}) {
    super(message);
    this.name = "KingsAiClientError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }
}

export function createKingsAiClient({
  baseUrl,
  accessToken,
  appId = "kings.collectors",
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (typeof appId !== "string" || !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(appId)) {
    throw new TypeError("KINGS AI appId is invalid.");
  }
  assertPositiveInteger(timeoutMs, "KINGS AI timeout");
  if (typeof fetchImpl !== "function") throw new TypeError("A fetch implementation is required.");
  const token = typeof accessToken === "string" && accessToken.trim() ? accessToken.trim() : null;

  async function request(path, { method = "GET", body } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = { Accept: "application/json" };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
        method,
        headers,
        signal: controller.signal,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const raw = await response.text();
      let payload;
      try {
        payload = JSON.parse(raw || "{}");
      } catch {
        throw new KingsAiClientError("invalid_response", "KINGS AI returned invalid JSON.", {
          statusCode: response.status,
          retryable: response.status >= 500
        });
      }
      return { ok: response.ok, statusCode: response.status, payload };
    } catch (error) {
      if (error instanceof KingsAiClientError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new KingsAiClientError("timeout", `KINGS AI request exceeded ${timeoutMs}ms.`, { retryable: true });
      }
      throw new KingsAiClientError("transport_error", error instanceof Error ? error.message : String(error), { retryable: true });
    } finally {
      clearTimeout(timer);
    }
  }

  function requireOk(result, fallbackCode) {
    if (result.ok) return result.payload;
    const payload = result.payload && typeof result.payload === "object" ? result.payload : {};
    throw new KingsAiClientError(
      typeof payload.error === "string" ? payload.error : fallbackCode,
      typeof payload.message === "string" ? payload.message : `KINGS AI request failed with HTTP ${result.statusCode}.`,
      {
        statusCode: result.statusCode,
        retryable: result.statusCode === 408 || result.statusCode === 429 || result.statusCode >= 500,
        details: payload
      }
    );
  }

  async function health() {
    const result = await request("/health");
    return requireOk(result, "health_failed");
  }

  async function listModels() {
    const result = await request("/v1/models");
    const payload = requireOk(result, "models_failed");
    if (!Array.isArray(payload.models)) throw new KingsAiClientError("invalid_models_response", "KINGS AI models response is invalid.");
    return payload.models;
  }

  async function route({
    messages,
    requiredCapabilities,
    maxOutputTokens,
    temperature,
    requireStructuredOutput,
    allowToolProposals,
    providerId,
    modelId,
    preferProviders,
    requestId
  } = {}) {
    if (!Array.isArray(messages) || messages.length === 0) throw new TypeError("KINGS AI route messages are required.");
    const result = await request("/v1/route", {
      method: "POST",
      body: {
        appId,
        messages,
        ...(requiredCapabilities === undefined ? {} : { requiredCapabilities }),
        ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
        ...(temperature === undefined ? {} : { temperature }),
        ...(requireStructuredOutput === undefined ? {} : { requireStructuredOutput }),
        ...(allowToolProposals === undefined ? {} : { allowToolProposals }),
        ...(providerId === undefined ? {} : { providerId }),
        ...(modelId === undefined ? {} : { modelId }),
        ...(preferProviders === undefined ? {} : { preferProviders }),
        ...(requestId === undefined ? {} : { requestId })
      }
    });
    const payload = result.payload;
    if (!payload || typeof payload !== "object" || typeof payload.success !== "boolean") {
      if (!result.ok) return requireOk(result, "route_failed");
      throw new KingsAiClientError("invalid_route_response", "KINGS AI route response is invalid.");
    }
    return payload;
  }

  return Object.freeze({ health, listModels, route });
}
