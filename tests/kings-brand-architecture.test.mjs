import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const DEFINITION = "KNOWLEDGE • INVESTIGATION • NARRATIVE • GENERATION • SYSTEM";

test("K.I.N.G.S. Collector's Kingdom brand and independent-brain gospel cannot silently drift", async () => {
  const [readme, gospel, landing, greatHall] = await Promise.all([
    read("README.md"),
    read("docs/KINGS_FAMILY_ARCHITECTURE_GOSPEL.md"),
    read("apps/web/public/index.html"),
    read("apps/web/public/great-hall.js")
  ]);

  assert.match(readme, /^# K\.I\.N\.G\.S\. Collector's Kingdom/m);
  assert.match(readme, new RegExp(DEFINITION));
  assert.match(readme, /Architecture Gospel — LOCKED/);
  assert.match(readme, /Normal collector-facing AI work must \*\*not require the separate K\.I\.N\.G\.S\. AI application to be online\*\*/);
  assert.match(readme, /OmniRoute and 9Router are first-class routing options/);
  assert.match(readme, /last-resort\/offline\/local fallback/);
  assert.match(readme, /known implementation gap/i);
  assert.doesNotMatch(readme, /## Shared K\.I\.N\.G\.S\. AI core/);

  assert.match(gospel, new RegExp(DEFINITION));
  assert.match(gospel, /Kingdom owns its own full application brain/);
  assert.match(gospel, /migration required/i);

  assert.match(landing, /K\.I\.N\.G\.S\. COLLECTOR'S KINGDOM/);
  assert.match(landing, new RegExp(DEFINITION));
  assert.doesNotMatch(landing, /shared K\.I\.N\.G\.S\. AI core/i);

  assert.match(greatHall, /Great Hall • K\.I\.N\.G\.S\. Collector's Kingdom/);
  assert.match(greatHall, new RegExp(DEFINITION));
});
