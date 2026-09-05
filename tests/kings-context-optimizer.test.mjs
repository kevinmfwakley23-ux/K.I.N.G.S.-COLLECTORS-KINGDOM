import test from "node:test";
import assert from "node:assert/strict";
import { ExecutionContextOptimizer } from "../packages/kings-core/src/context-optimizer.mjs";

test("KINGS parent context optimizer caps records and retains only referenced evidence", () => {
  const optimizer = new ExecutionContextOptimizer({ maxRecords: 2, maxEvidence: 2 });
  const context = {
    taskId: "keeper-task-1",
    knowledge: {
      query: "signed jersey authentication",
      records: [
        { id: "r1", sourceId: "vault", evidenceIds: ["e1", "e2"] },
        { id: "r2", sourceId: "research", evidenceIds: ["e2", "e3"] },
        { id: "r3", sourceId: "ignored", evidenceIds: ["e4"] }
      ],
      evidence: [
        { id: "e1" },
        { id: "orphan" },
        { id: "e2" },
        { id: "e3" },
        { id: "e4" }
      ],
      sourceIds: ["stale"]
    }
  };

  const result = optimizer.optimize(context);
  assert.deepEqual(result.knowledge.records.map((record) => record.id), ["r1", "r2"]);
  assert.deepEqual(result.knowledge.evidence.map((item) => item.id), ["e1", "e2"]);
  assert.deepEqual(result.knowledge.records[0].evidenceIds, ["e1", "e2"]);
  assert.deepEqual(result.knowledge.records[1].evidenceIds, ["e2"]);
  assert.deepEqual(result.knowledge.sourceIds, ["vault", "research"]);
  assert.equal(context.knowledge.records.length, 3, "optimizer must not mutate caller context");
});

test("KINGS parent context optimizer validates limits and leaves contexts without knowledge alone", () => {
  assert.throws(() => new ExecutionContextOptimizer({ maxRecords: 0, maxEvidence: 1 }), /maxRecords/);
  assert.throws(() => new ExecutionContextOptimizer({ maxRecords: 1, maxEvidence: 0 }), /maxEvidence/);
  const optimizer = new ExecutionContextOptimizer();
  const context = { taskId: "no-knowledge" };
  assert.equal(optimizer.optimize(context), context);
});
