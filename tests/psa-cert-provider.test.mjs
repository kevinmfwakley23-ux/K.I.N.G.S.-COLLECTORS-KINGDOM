import test from "node:test";
import assert from "node:assert/strict";
import { createPsaCertificationProvider, normalizePsaCertNumber } from "../packages/catalog/src/psa-cert-provider.mjs";
import { CatalogProviderError } from "../packages/catalog/src/open-library-provider.mjs";

function jsonResponse(payload, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json", ...headers } });
}

function samplePayload(overrides = {}) {
  return {
    IsValidRequest: true,
    ServerMessage: "Request successful",
    PSACert: {
      CertNumber: "113591449",
      SpecID: 12345,
      SpecNumber: "53",
      LabelType: "Fugitive Ink Technology",
      ReverseBarCode: true,
      Year: "1971",
      Brand: "TOPPS",
      Category: "FOOTBALL CARDS",
      CardNumber: "53",
      Subject: "BUBBA SMITH",
      Variety: null,
      IsPSADNA: false,
      IsDualCert: false,
      GradeDescription: "NM-MT 8",
      CardGrade: "8",
      PrimarySigners: [],
      OtherSigners: [],
      AutographGrade: null,
      TotalPopulation: 176,
      TotalPopulationWithQualifier: 0,
      PopulationHigher: 19,
      ItemStatus: "Active"
    },
    DNACert: null,
    PSAEstimate: 999.99,
    Sales: [{ price: 100.00 }],
    ...overrides
  };
}

test("PSA cert number normalization accepts numeric certification IDs only", () => {
  assert.equal(normalizePsaCertNumber(" 113591449 "), "113591449");
  assert.equal(normalizePsaCertNumber(12345678), "12345678");
  for (const invalid of ["", "ABC123", "123-456", "1234567890123"]) {
    assert.throws(() => normalizePsaCertNumber(invalid), (error) => {
      assert.ok(error instanceof CatalogProviderError);
      assert.equal(error.code, "invalid_psa_cert_number");
      assert.equal(error.retryable, false);
      return true;
    });
  }
});

test("PSA provider requires a server-side token and never puts it in URLs or normalized evidence", async () => {
  const unconfigured = createPsaCertificationProvider({
    baseUrl: "http://127.0.0.1:9930",
    minIntervalMs: 1,
    fetchImpl: async () => { throw new Error("network must not run without token"); }
  });
  assert.equal(unconfigured.configured, false);
  await assert.rejects(() => unconfigured.lookup({ identifierType: "psa-cert", identifierValue: "113591449" }), (error) => {
    assert.equal(error.code, "catalog_provider_configuration_required");
    assert.equal(error.retryable, false);
    return true;
  });

  const calls = [];
  const configured = createPsaCertificationProvider({
    baseUrl: "http://127.0.0.1:9930",
    accessToken: "server-only-psa-token",
    minIntervalMs: 1,
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return jsonResponse(samplePayload());
    }
  });
  assert.equal(configured.configured, true);
  assert.equal(configured.cacheTtlMs, 15 * 60 * 1000);
  const result = await configured.lookup({ identifierType: "psa-cert", identifierValue: "113591449" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://127.0.0.1:9930/cert/GetByCertNumber/113591449");
  assert.equal(calls[0].options.headers.Authorization, "bearer server-only-psa-token");
  assert.equal(result.lookupUrl, "https://www.psacard.com/cert/113591449");
  assert.equal(result.candidates[0].sourceUrl, "https://www.psacard.com/cert/113591449");
  assert.doesNotMatch(calls[0].url, /server-only-psa-token/);
  assert.doesNotMatch(result.lookupUrl, /api\.psacard\.com|server-only-psa-token/i);
  assert.doesNotMatch(JSON.stringify(result), /server-only-psa-token/);
});

test("PSA provider maps certification database metadata without authenticating the physical slab or importing value data", async () => {
  const provider = createPsaCertificationProvider({
    baseUrl: "http://127.0.0.1:9930",
    accessToken: "token",
    minIntervalMs: 1,
    fetchImpl: async () => jsonResponse(samplePayload())
  });
  const result = await provider.lookup({ identifierType: "psa-cert", identifierValue: "113591449" });
  assert.equal(result.candidates.length, 1);
  const candidate = result.candidates[0];
  assert.equal(candidate.providerId, "psa-cert");
  assert.equal(candidate.evidenceClass, "certification-database-record");
  assert.equal(candidate.certificationNumberVerifiedInDatabase, true);
  assert.equal(candidate.physicalItemAuthenticated, false);
  assert.equal(candidate.fields.psaCert.certNumber, "113591449");
  assert.equal(candidate.fields.psaCert.gradeDescription, "NM-MT 8");
  assert.equal(candidate.fields.psaCert.cardGrade, "8");
  assert.equal(candidate.fields.psaCert.subject, "BUBBA SMITH");
  assert.equal(candidate.fields.psaCert.totalPopulation, 176);
  assert.match(candidate.matchReason, /does not by itself prove/i);
  assert.doesNotMatch(JSON.stringify(candidate), /999\.99|Sales|price/i);
});

test("PSA provider supports PSA/DNA-only evidence without turning database result into physical-authenticity proof", async () => {
  const provider = createPsaCertificationProvider({
    baseUrl: "http://127.0.0.1:9930",
    accessToken: "token",
    minIntervalMs: 1,
    fetchImpl: async () => jsonResponse(samplePayload({
      PSACert: null,
      DNACert: {
        CertNumber: "113591449",
        ItemDescription: "Signed football",
        AuthenticationResult: "Authentic",
        SignatureGrade: "9",
        DNAItemType: "Autograph",
        Notes: "Provider record note"
      }
    }))
  });
  const candidate = (await provider.lookup({ identifierType: "psa-cert", identifierValue: "113591449" })).candidates[0];
  assert.equal(candidate.certificationKind, "psa-dna");
  assert.equal(candidate.fields.dnaCert.authenticationResult, "Authentic");
  assert.equal(candidate.physicalItemAuthenticated, false);
});

test("PSA provider distinguishes invalid requests, no-data records, auth failures, and rate limits", async () => {
  const invalid = createPsaCertificationProvider({
    baseUrl: "http://127.0.0.1:9930", accessToken: "token", minIntervalMs: 1,
    fetchImpl: async () => jsonResponse({ IsValidRequest: false, ServerMessage: "Invalid CertNo" })
  });
  await assert.rejects(() => invalid.lookup({ identifierType: "psa-cert", identifierValue: "1" }), (error) => error.code === "invalid_psa_cert_number");

  const noData = createPsaCertificationProvider({
    baseUrl: "http://127.0.0.1:9930", accessToken: "token", minIntervalMs: 1,
    fetchImpl: async () => jsonResponse({ IsValidRequest: true, ServerMessage: "No data found", PSACert: null, DNACert: null })
  });
  const empty = await noData.lookup({ identifierType: "psa-cert", identifierValue: "99999999" });
  assert.deepEqual(empty.candidates, []);

  const unauthorized = createPsaCertificationProvider({
    baseUrl: "http://127.0.0.1:9930", accessToken: "token", minIntervalMs: 1,
    fetchImpl: async () => jsonResponse({}, { status: 401 })
  });
  await assert.rejects(() => unauthorized.lookup({ identifierType: "psa-cert", identifierValue: "113591449" }), (error) => error.code === "catalog_provider_unauthorized");

  const limited = createPsaCertificationProvider({
    baseUrl: "http://127.0.0.1:9930", accessToken: "token", minIntervalMs: 1,
    fetchImpl: async () => jsonResponse({}, { status: 429, headers: { "retry-after": "5" } })
  });
  await assert.rejects(() => limited.lookup({ identifierType: "psa-cert", identifierValue: "113591449" }), (error) => {
    assert.equal(error.code, "catalog_provider_rate_limited");
    assert.equal(error.details.retryAfter, "5");
    return true;
  });
});

test("PSA provider serializes requests and rejects identifier mismatch and malformed/oversized responses", async () => {
  let time = 1000;
  const sleeps = [];
  const calls = [];
  const paced = createPsaCertificationProvider({
    baseUrl: "http://127.0.0.1:9930", accessToken: "token", minIntervalMs: 1000,
    now: () => time,
    sleep: async (milliseconds) => { sleeps.push(milliseconds); time += milliseconds; },
    fetchImpl: async () => { calls.push(time); return jsonResponse(samplePayload()); }
  });
  await paced.lookup({ identifierType: "psa-cert", identifierValue: "113591449" });
  await paced.lookup({ identifierType: "psa-cert", identifierValue: "113591449" });
  assert.deepEqual(calls, [1000, 2000]);
  assert.deepEqual(sleeps, [1000]);

  const mismatch = createPsaCertificationProvider({
    baseUrl: "http://127.0.0.1:9930", accessToken: "token", minIntervalMs: 1,
    fetchImpl: async () => jsonResponse(samplePayload({ PSACert: { ...samplePayload().PSACert, CertNumber: "12345678" } }))
  });
  await assert.rejects(() => mismatch.lookup({ identifierType: "psa-cert", identifierValue: "113591449" }), (error) => error.code === "catalog_provider_identifier_mismatch");

  const malformed = createPsaCertificationProvider({
    baseUrl: "http://127.0.0.1:9930", accessToken: "token", minIntervalMs: 1,
    fetchImpl: async () => new Response("not-json", { status: 200 })
  });
  await assert.rejects(() => malformed.lookup({ identifierType: "psa-cert", identifierValue: "113591449" }), (error) => error.code === "catalog_provider_invalid_json");

  const oversized = createPsaCertificationProvider({
    baseUrl: "http://127.0.0.1:9930", accessToken: "token", minIntervalMs: 1, maxResponseBytes: 64,
    fetchImpl: async () => jsonResponse(samplePayload())
  });
  await assert.rejects(() => oversized.lookup({ identifierType: "psa-cert", identifierValue: "113591449" }), (error) => error.code === "catalog_provider_payload_too_large");
});
