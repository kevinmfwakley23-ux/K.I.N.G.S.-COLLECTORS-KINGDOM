import test from "node:test";
import assert from "node:assert/strict";
import { MemoryContextAuthority } from "../packages/kings-core/src/memory-context-authority.mjs";
import { MemoryRelevance } from "../packages/kings-core/src/memory-relevance.mjs";
import { KnowledgeRetrieval } from "../packages/kings-core/src/knowledge-retrieval.mjs";

function memory(id, summary, overrides = {}) {
  return {
    id,
    type: "semantic",
    summary,
    sourceReferences: [`source:${id}`],
    authoritative: false,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    ...overrides
  };
}

test("KINGS parent MemoryContextAuthority keeps provenance and portability semantics", () => {
  const authority = new MemoryContextAuthority();
  const contextual = memory("m1", "collector preference", {
    missionId: "collector:123",
    sourceReferences: ["vault:preference:1"]
  });
  const inspected = authority.inspect(contextual);
  assert.equal(inspected.memoryId, "m1");
  assert.equal(inspected.hasMissionContext, true);
  assert.equal(inspected.hasTaskContext, false);
  assert.equal(inspected.hasProvenance, true);
  assert.equal(authority.isContextSpecific(contextual), true);
  assert.equal(authority.isProjectPortable(contextual), false);
  assert.equal(authority.isProjectPortable(memory("m2", "portable procedure")), true);
  assert.throws(
    () => authority.inspect({ ...contextual, sourceReferences: [] }),
    /requires provenance/
  );
});

test("KINGS parent MemoryRelevance preserves mission, task, authority, lexical, and type scoring", () => {
  const relevance = new MemoryRelevance();
  const task = {
    id: "keeper:question:1",
    missionId: "collector:123",
    name: "Research signed jersey",
    description: "Find authentication and valuation evidence for the signed jersey",
    expectedOutputs: ["source backed answer"],
    inputReferences: ["vault:treasure:jersey-1"]
  };
  const exact = memory("exact", "signed jersey authentication evidence", {
    taskId: task.id,
    missionId: task.missionId,
    authoritative: true
  });
  const mission = memory("mission", "signed jersey valuation evidence", {
    missionId: task.missionId,
    type: "procedural"
  });
  const unrelated = memory("other", "comic book storage notes", { type: "working" });

  const ranked = relevance.rank(task, [unrelated, mission, exact], 3);
  assert.equal(ranked[0].memory.id, "exact");
  assert.ok(ranked[0].score > ranked[1].score);
  assert.ok(ranked[0].reasons.includes("exact task match"));
  assert.ok(ranked[0].reasons.includes("mission match"));
  assert.ok(ranked[0].reasons.includes("authoritative memory"));
  assert.equal(ranked[1].memory.id, "mission");
  assert.throws(() => relevance.rank(task, [exact], -1), /non-negative integer/);
});

test("KINGS parent KnowledgeRetrieval keeps all-term matching, evidence, source, and authority behavior", () => {
  const records = [
    {
      id: "r1",
      sourceId: "s1",
      memoryType: "semantic",
      summary: "Michael Jordan rookie card authentication",
      content: "Fleer 1986 sports card evidence",
      evidenceIds: ["e1"],
      authoritative: true
    },
    {
      id: "r2",
      sourceId: "s2",
      memoryType: "semantic",
      summary: "Michael Jordan poster memorabilia",
      content: "music tour poster",
      evidenceIds: ["e2"],
      authoritative: false
    }
  ];
  const evidence = new Map([
    ["e1", { id: "e1", sourceId: "s1", description: "card source" }],
    ["e2", { id: "e2", sourceId: "s2", description: "poster source" }]
  ]);
  const registry = {
    listRecords: () => records,
    getEvidence: (id) => evidence.get(id)
  };
  const retrieval = new KnowledgeRetrieval(registry);

  const result = retrieval.retrieve({ query: "Michael Jordan", limit: 10 });
  assert.deepEqual(result.records.map((record) => record.id), ["r1", "r2"]);
  assert.deepEqual(new Set(result.sourceIds), new Set(["s1", "s2"]));
  assert.equal(result.evidence.length, 2);

  const authoritative = retrieval.retrieve({
    query: "Michael Jordan",
    authoritativeOnly: true,
    limit: 10
  });
  assert.deepEqual(authoritative.records.map((record) => record.id), ["r1"]);

  const noPartial = retrieval.retrieve({ query: "Michael authentication poster", limit: 10 });
  assert.equal(noPartial.records.length, 0);
});
