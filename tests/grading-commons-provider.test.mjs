import test from "node:test";
import assert from "node:assert/strict";
import { createCommonsAutographProvider, GradingReferenceError } from "../packages/grading/src/commons-autograph-provider.mjs";

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json", ...headers } });
}

function searchPayload() {
  return {
    query: {
      pages: [{
        pageid: 123,
        title: "File:Example Person signature.svg",
        imageinfo: [{
          descriptionurl: "https://commons.wikimedia.org/wiki/File:Example_Person_signature.svg",
          width: 900,
          height: 300,
          mime: "image/svg+xml",
          extmetadata: {
            LicenseShortName: { value: "CC BY-SA 4.0" },
            LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0/" },
            Artist: { value: "<b>Example uploader</b>" },
            Credit: { value: "Wikimedia Commons" },
            ImageDescription: { value: "Example Person signature" }
          }
        }]
      }]
    }
  };
}

test("Commons autograph search uses identifiable traffic and returns review-only licensed reference candidates", async () => {
  const requests = [];
  const provider = createCommonsAutographProvider({
    minIntervalMs: 1,
    sleep: async () => {},
    now: () => 1000,
    version: "test-version",
    contact: "https://example.test/project",
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options });
      return jsonResponse(searchPayload());
    }
  });

  const result = await provider.searchSigner("Example Person");
  assert.equal(result.providerId, "wikimedia-commons");
  assert.equal(result.signer, "Example Person");
  assert.equal(result.authenticationClaim, false);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].referenceScope, "public-web-reference");
  assert.equal(result.candidates[0].signerIdentityConfirmed, false);
  assert.equal(result.candidates[0].authenticationReference, false);
  assert.equal(result.candidates[0].authenticationClaim, false);
  assert.equal(result.candidates[0].license.name, "CC BY-SA 4.0");
  assert.equal(result.candidates[0].license.artist, "Example uploader");
  assert.match(result.candidates[0].imageProxyUrl, /^\/api\/grading\/autograph-reference-image\?title=/);
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /generator=search/);
  assert.match(requests[0].url, /gsrnamespace=6/);
  assert.match(requests[0].options.headers["User-Agent"], /KINGS-Collectors-Kingdom\/test-version/);
  assert.match(requests[0].options.headers["User-Agent"], /example\.test\/project/);
});

test("Commons reference image fetch resolves the file through the API and accepts only allowlisted Wikimedia image hosts/types", async () => {
  const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const requests = [];
  const provider = createCommonsAutographProvider({
    minIntervalMs: 1,
    sleep: async () => {},
    now: () => 1000,
    fetchImpl: async (url, options) => {
      requests.push({ url: String(url), options });
      if (String(url).includes("w/api.php")) {
        return jsonResponse({
          query: {
            pages: [{
              pageid: 123,
              title: "File:Example Person signature.png",
              imageinfo: [{
                thumburl: "https://upload.wikimedia.org/example/signature.png",
                url: "https://upload.wikimedia.org/example/original.png",
                width: 1000,
                height: 300,
                mime: "image/png"
              }]
            }]
          }
        });
      }
      return new Response(imageBytes, { status: 200, headers: { "content-type": "image/png", "content-length": String(imageBytes.length) } });
    }
  });

  const result = await provider.fetchReferenceImage("File:Example Person signature.png");
  assert.equal(result.contentType, "image/png");
  assert.deepEqual(result.bytes, imageBytes);
  assert.equal(requests.length, 2);
  assert.match(requests[0].url, /prop=imageinfo/);
  assert.match(requests[1].url, /^https:\/\/upload\.wikimedia\.org\//);
  assert.equal(requests[1].options.headers.Accept, "image/*");
});

test("Commons provider rejects invalid signer/file input and unexpected reference hosts instead of proxying arbitrary URLs", async () => {
  const provider = createCommonsAutographProvider({
    minIntervalMs: 1,
    sleep: async () => {},
    now: () => 1000,
    fetchImpl: async () => jsonResponse({
      query: {
        pages: [{
          pageid: 9,
          title: "File:Bad.png",
          imageinfo: [{ thumburl: "https://attacker.example/bad.png", url: "https://attacker.example/bad.png" }]
        }]
      }
    })
  });

  await assert.rejects(() => provider.searchSigner("x"), (error) => error instanceof GradingReferenceError && error.code === "invalid_signer");
  await assert.rejects(() => provider.fetchReferenceImage("https://attacker.example/bad.png"), (error) => error instanceof GradingReferenceError && error.code === "invalid_file_title");
  await assert.rejects(() => provider.fetchReferenceImage("File:Bad.png"), (error) => error instanceof GradingReferenceError && error.code === "reference_image_host_rejected");
});
