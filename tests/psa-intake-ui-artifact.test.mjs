import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

test("live Royal Intake UI exposes PSA certification lookup while blocking automatic treasure/grade handoff", async () => {
  const [uiSource, policySource] = await Promise.all([
    readFile(resolve(root, "apps/web/public/vault-intake-ui.js"), "utf8"),
    readFile(resolve(root, "apps/web/public/vault-catalog-core.js"), "utf8")
  ]);
  assert.match(uiSource, /"psa-cert"/);
  assert.match(policySource, /Verify PSA cert record/);
  assert.match(policySource, /certificationOnly:\s*true/);
  assert.match(uiSource, /Certification database evidence only/);
  assert.match(uiSource, /Compare the returned label data with the physical holder/);
  assert.match(uiSource, /!isCertificationEvidenceType\(item\.identifierType\)/);
  assert.doesNotMatch(uiSource, /treasure-grade[^\n]*candidate|candidate[^\n]*treasure-grade/i);
  assert.doesNotMatch(`${uiSource}\n${policySource}`, /physicalItemAuthenticated\s*=\s*true/i);
});
