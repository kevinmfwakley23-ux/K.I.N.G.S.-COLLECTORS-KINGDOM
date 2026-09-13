import test from "node:test";
import assert from "node:assert/strict";
import { handleVaultReportRoute } from "../apps/web/vault-report-http.mjs";
import { renderInsurancePreparationReportHtml } from "../apps/web/vault-report-html.mjs";
import { VaultError } from "../packages/vault/src/service.mjs";

function fixtureReport() {
  return {
    schemaVersion: 1,
    policyId: "kingdom-insurance-preparation-v1",
    reportId: "report-1",
    reportType: "collection-evidence-insurance-preparation",
    generatedAt: "2026-09-13T15:00:00.000Z",
    scope: { type: "kingdom", includeArchived: false },
    summary: {
      treasureCount: 1,
      unitCount: 1,
      treasuresWithMedia: 0,
      treasuresWithProvenance: 0,
      treasuresWithRecordedAcquisitionCost: 0,
      treasuresWithAdvisoryEstimate: 0,
      recordedAcquisitionTotals: [],
      advisoryEstimateTotals: []
    },
    portfolioSnapshotCitation: {
      snapshotId: "snapshot-1",
      generatedAt: "2026-09-13T15:00:00.000Z",
      snapshotSha256: "a".repeat(64),
      captureCreatedNewSnapshot: false,
      captureReason: "unchanged-same-day"
    },
    treasures: [{
      treasureId: "treasure-1",
      title: '<script>alert("x")</script>',
      category: "Card",
      year: 1999,
      tags: ["Favorite"],
      description: null,
      manufacturer: null,
      series: null,
      variant: null,
      quantity: 1,
      condition: "Near Mint",
      conditionNotes: null,
      collection: null,
      storageLocation: null,
      externalIdentifiers: {},
      attributes: {},
      notes: null,
      archivedAt: null,
      recordedFinancialFacts: { acquisition: null, provenanceEventsWithAmounts: [] },
      media: [],
      provenance: [],
      advisoryMarketEstimate: {
        available: false,
        snapshotId: "snapshot-1",
        snapshotGeneratedAt: "2026-09-13T15:00:00.000Z",
        snapshotSha256: "a".repeat(64),
        reason: "no-valuation-evidence",
        evidenceIds: [],
        evidence: [],
        appraisal: false,
        guaranteedSalePrice: false
      }
    }],
    policy: {
      ownerScoped: true,
      automaticFxConversion: false,
      currenciesSeparated: true,
      recordedFinancialFactsSeparatedFromAdvisoryEstimates: true,
      advisoryEstimateIsAppraisal: false,
      insurerAcceptanceGuaranteed: false,
      professionalAuthenticationImplied: false,
      mediaFilesRemainPrivateAndAuthenticated: true,
      destructiveMutationPerformed: false,
      reportPurpose: "collector documentation and insurance preparation"
    },
    disclaimer: "This is not an appraisal.",
    integrity: { algorithm: "sha256", reportSha256: "b".repeat(64) }
  };
}

function responseCapture() {
  return {
    statusCode: null,
    headers: null,
    body: null,
    writeHead(statusCode, headers) { this.statusCode = statusCode; this.headers = headers; },
    end(body) { this.body = body ?? null; }
  };
}

function request(method = "GET") {
  return { method, headers: { cookie: "kingdom_session=test-session" } };
}

const identityService = { authenticate() { return { id: "owner" }; } };

test("print report escapes collector-controlled text and carries explicit non-appraisal language", () => {
  const html = renderInsurancePreparationReportHtml(fixtureReport());
  assert.match(html, /Collection Evidence Report/);
  assert.match(html, /Not an appraisal/);
  assert.match(html, /vault-report\.css/);
  assert.match(html, /vault-report\.js/);
  assert.doesNotMatch(html, /<script>alert\("x"\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.match(html, /snapshot-1/);
  assert.match(html, new RegExp("a{64}"));
});

test("report HTTP route serves owner-scoped no-store JSON attachments and passes scope inputs", async () => {
  const response = responseCapture();
  let received = null;
  const vaultReportService = {
    generate(_identity, input) {
      received = input;
      return fixtureReport();
    }
  };
  await handleVaultReportRoute({
    request: request("GET"),
    response,
    requestUrl: new URL("http://kingdom.local/api/vault/reports/insurance-preparation?format=json&download=true&collectionId=collection-1&includeArchived=true"),
    identityService,
    vaultReportService,
    securityHeaders: { "X-Frame-Options": "DENY" }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["Cache-Control"], "private, no-store, max-age=0");
  assert.equal(response.headers.Pragma, "no-cache");
  assert.match(response.headers["Content-Disposition"], /attachment/);
  assert.equal(response.headers["X-Frame-Options"], "DENY");
  assert.deepEqual(received, { collectionId: "collection-1", treasureIds: [], includeArchived: true });
  assert.equal(JSON.parse(response.body).reportId, "report-1");
});

test("report HTTP route serves print HTML, preserves repeated treasure selection, and rejects unsupported format", async () => {
  const response = responseCapture();
  let received = null;
  const vaultReportService = {
    generate(_identity, input) {
      received = input;
      return fixtureReport();
    }
  };
  await handleVaultReportRoute({
    request: request("GET"),
    response,
    requestUrl: new URL("http://kingdom.local/api/vault/reports/insurance-preparation?format=html&treasureId=t-1&treasureId=t-2"),
    identityService,
    vaultReportService,
    securityHeaders: {}
  });
  assert.equal(response.statusCode, 200);
  assert.match(response.headers["Content-Type"], /^text\/html/);
  assert.match(response.headers["Content-Disposition"], /^inline/);
  assert.deepEqual(received.treasureIds, ["t-1", "t-2"]);
  assert.match(response.body, /Collection Evidence Report/);

  await assert.rejects(
    () => handleVaultReportRoute({
      request: request("GET"),
      response: responseCapture(),
      requestUrl: new URL("http://kingdom.local/api/vault/reports/insurance-preparation?format=pdf"),
      identityService,
      vaultReportService,
      securityHeaders: {}
    }),
    (error) => error instanceof VaultError && error.code === "invalid_report_format"
  );
});

test("report route rejects mutation methods and ignores unrelated paths", async () => {
  const service = { generate() { return fixtureReport(); } };
  const methodResult = await handleVaultReportRoute({
    request: request("POST"),
    response: responseCapture(),
    requestUrl: new URL("http://kingdom.local/api/vault/reports/insurance-preparation"),
    identityService,
    vaultReportService: service,
    securityHeaders: {}
  });
  assert.equal(methodResult, false);

  const unrelated = await handleVaultReportRoute({
    request: request("GET"),
    response: responseCapture(),
    requestUrl: new URL("http://kingdom.local/api/vault/reports/other"),
    identityService,
    vaultReportService: service,
    securityHeaders: {}
  });
  assert.equal(unrelated, null);
});
