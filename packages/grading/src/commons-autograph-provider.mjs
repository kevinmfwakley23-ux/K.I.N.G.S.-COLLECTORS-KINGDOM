const ALLOWED_IMAGE_HOSTS = new Set(["upload.wikimedia.org", "commons.wikimedia.org"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

export class GradingReferenceError extends Error {
  constructor(code, message, { statusCode = 502, retryable = false, details = null } = {}) {
    super(message);
    this.name = "GradingReferenceError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function cleanBaseUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) throw new TypeError("Wikimedia Commons API must use HTTPS outside local testing.");
  return parsed.toString();
}

function cleanSigner(value) {
  if (typeof value !== "string") throw new GradingReferenceError("invalid_signer", "A signer name is required.", { statusCode: 400 });
  const cleaned = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (cleaned.length < 2 || cleaned.length > 120 || /[\u0000-\u001f\u007f]/.test(cleaned)) throw new GradingReferenceError("invalid_signer", "Signer name must contain 2 to 120 printable characters.", { statusCode: 400 });
  return cleaned;
}

function cleanFileTitle(value) {
  if (typeof value !== "string") throw new GradingReferenceError("invalid_file_title", "A Wikimedia Commons file title is required.", { statusCode: 400 });
  const cleaned = value.normalize("NFKC").trim();
  if (!cleaned.startsWith("File:") || cleaned.length > 300 || /[\u0000-\u001f\u007f]/.test(cleaned)) throw new GradingReferenceError("invalid_file_title", "Wikimedia Commons file title is invalid.", { statusCode: 400 });
  return cleaned;
}

function stripMarkup(value, max = 800) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function metadataValue(imageInfo, key, max = 800) {
  return stripMarkup(imageInfo?.extmetadata?.[key]?.value, max);
}

function safeHttpsUrl(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function candidateFromPage(page) {
  const info = page?.imageinfo?.[0];
  if (!page || typeof page !== "object" || !Number.isInteger(page.pageid) || typeof page.title !== "string" || !info) return null;
  const sourceUrl = safeHttpsUrl(info.descriptionurl);
  if (!sourceUrl) return null;
  const licenseName = metadataValue(info, "LicenseShortName", 160);
  const licenseUrl = safeHttpsUrl(info?.extmetadata?.LicenseUrl?.value ?? null);
  return Object.freeze({
    referenceId: `commons:${page.pageid}`,
    providerId: "wikimedia-commons",
    providerName: "Wikimedia Commons",
    fileTitle: page.title,
    label: stripMarkup(metadataValue(info, "ImageDescription", 300) ?? page.title, 300),
    sourceUrl,
    imageProxyUrl: `/api/grading/autograph-reference-image?title=${encodeURIComponent(page.title)}`,
    license: Object.freeze({
      name: licenseName,
      url: licenseUrl,
      artist: metadataValue(info, "Artist", 300),
      credit: metadataValue(info, "Credit", 500)
    }),
    dimensions: Object.freeze({ width: Number(info.width) || null, height: Number(info.height) || null }),
    mime: typeof info.mime === "string" ? info.mime : null,
    reviewRequired: true,
    referenceScope: "public-web-reference",
    signerIdentityConfirmed: false,
    authenticationReference: false,
    authenticationClaim: false,
    note: "Public web image candidate for visual comparison. Confirm that this file actually depicts the intended signer's autograph and review its source/license before relying on it."
  });
}

export function createCommonsAutographProvider({
  fetchImpl = globalThis.fetch,
  baseUrl = "https://commons.wikimedia.org/w/api.php",
  timeoutMs = 5000,
  maxJsonBytes = 512 * 1024,
  maxImageBytes = 4 * 1024 * 1024,
  minIntervalMs = 500,
  now = () => Date.now(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  version = "0.2.0",
  contact = "https://github.com/kevinmfwakley23-ux/K.I.N.G.S.-COLLECTORS-KINGDOM"
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("Wikimedia Commons autograph provider requires fetch.");
  if (typeof now !== "function" || typeof sleep !== "function") throw new TypeError("Wikimedia Commons timing hooks must be functions.");
  positiveInteger(timeoutMs, "Commons timeoutMs");
  positiveInteger(maxJsonBytes, "Commons maxJsonBytes");
  positiveInteger(maxImageBytes, "Commons maxImageBytes");
  positiveInteger(minIntervalMs, "Commons minIntervalMs");
  const endpoint = cleanBaseUrl(baseUrl);
  const userAgent = `KINGS-Collectors-Kingdom/${String(version).trim() || "unknown"} (${String(contact).trim()})`;
  let queue = Promise.resolve();
  let nextAllowedAt = 0;

  function schedule(task) {
    const scheduled = queue.then(async () => {
      const wait = Math.max(0, nextAllowedAt - now());
      if (wait > 0) await sleep(wait);
      nextAllowedAt = now() + minIntervalMs;
      return task();
    });
    queue = scheduled.then(() => undefined, () => undefined);
    return scheduled;
  }

  async function fetchBounded(url, { maxBytes, accept }) {
    return schedule(async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetchImpl(url, { method: "GET", headers: { Accept: accept, "User-Agent": userAgent }, signal: controller.signal });
      } catch (error) {
        if (error?.name === "AbortError") throw new GradingReferenceError("reference_timeout", "Wikimedia Commons reference request timed out.", { statusCode: 504, retryable: true });
        throw new GradingReferenceError("reference_unavailable", "Wikimedia Commons reference request could not be reached.", { statusCode: 503, retryable: true, details: { cause: error?.message ?? String(error) } });
      } finally {
        clearTimeout(timer);
      }
      if (response.status === 429) throw new GradingReferenceError("reference_rate_limited", "Wikimedia Commons temporarily rate-limited reference lookup.", { statusCode: 503, retryable: true, details: { retryAfter: response.headers.get("retry-after") ?? null } });
      if (!response.ok) throw new GradingReferenceError("reference_http_error", `Wikimedia Commons returned HTTP ${response.status}.`, { statusCode: response.status >= 500 ? 503 : 502, retryable: response.status >= 500, details: { providerStatus: response.status } });
      const announced = Number(response.headers.get("content-length") ?? 0);
      if (Number.isFinite(announced) && announced > maxBytes) throw new GradingReferenceError("reference_payload_too_large", "Wikimedia Commons response exceeded the protected payload limit.");
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > maxBytes) throw new GradingReferenceError("reference_payload_too_large", "Wikimedia Commons response exceeded the protected payload limit.");
      return { response, buffer };
    });
  }

  async function requestJson(url) {
    const { buffer } = await fetchBounded(url, { maxBytes: maxJsonBytes, accept: "application/json" });
    try { return JSON.parse(buffer.toString("utf8")); }
    catch { throw new GradingReferenceError("reference_invalid_json", "Wikimedia Commons returned malformed JSON.", { retryable: true }); }
  }

  function searchUrl(signer) {
    const url = new URL(endpoint);
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      generator: "search",
      gsrsearch: `\"${signer}\" signature autograph`,
      gsrnamespace: "6",
      gsrlimit: "8",
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      iiurlwidth: "900",
      iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription"
    }).toString();
    return url;
  }

  function imageInfoUrl(fileTitle) {
    const url = new URL(endpoint);
    url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", titles: fileTitle, prop: "imageinfo", iiprop: "url|size|mime", iiurlwidth: "1000" }).toString();
    return url;
  }

  async function searchSigner(rawSigner) {
    const signer = cleanSigner(rawSigner);
    const payload = await requestJson(searchUrl(signer));
    const pages = Array.isArray(payload?.query?.pages) ? payload.query.pages : [];
    const candidates = pages.map(candidateFromPage).filter(Boolean).slice(0, 8);
    return Object.freeze({
      providerId: "wikimedia-commons",
      providerName: "Wikimedia Commons",
      signer,
      candidates: Object.freeze(candidates),
      authenticationClaim: false,
      note: "Search results are public reference candidates only. Each exemplar must be reviewed for signer identity, provenance and license before visual comparison."
    });
  }

  async function fetchReferenceImage(rawFileTitle) {
    const fileTitle = cleanFileTitle(rawFileTitle);
    const payload = await requestJson(imageInfoUrl(fileTitle));
    const page = Array.isArray(payload?.query?.pages) ? payload.query.pages[0] : null;
    const info = page?.imageinfo?.[0];
    const imageUrl = safeHttpsUrl(info?.thumburl ?? info?.url);
    if (!imageUrl) throw new GradingReferenceError("reference_image_not_found", "Wikimedia Commons did not return a usable image URL for that file.", { statusCode: 404 });
    const parsed = new URL(imageUrl);
    if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) throw new GradingReferenceError("reference_image_host_rejected", "Wikimedia Commons returned an unexpected image host.");
    const { response, buffer } = await fetchBounded(parsed, { maxBytes: maxImageBytes, accept: "image/*" });
    const contentType = String(response.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) throw new GradingReferenceError("reference_image_type_rejected", "Wikimedia Commons reference image type is unsupported.", { statusCode: 415, details: { contentType } });
    return Object.freeze({ fileTitle, contentType, bytes: buffer });
  }

  return Object.freeze({ id: "wikimedia-commons", name: "Wikimedia Commons", searchSigner, fetchReferenceImage });
}
