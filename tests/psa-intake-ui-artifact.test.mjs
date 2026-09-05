import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

test("live Royal Intake UI exposes PSA certification lookup while blocking automatic treasure/grade handoff", async () => {
  const source = await readFile(resolve(root, "apps/web/public/vault-intake-ui.js"), "utf8");
  assert.match(source, /"psa-cert"/);
  assert.match(source, /Verify PSA cert record/);
  assert.match(source, /Certification database evidence only/);
  assert.match(source, /Compare the returned label data with the physical holder/);
  assert.match(source, /!isCertificationEvidenceType\(item\.identifierType\)/);
  assert.doesNotMatch(source, /treasure-grade[^\n]*candidate|candidate[^\n]*treasure-grade/i);
  assert.doesNotMatch(source, /physicalItemAuthenticated\s*=\s*true/i);
});
