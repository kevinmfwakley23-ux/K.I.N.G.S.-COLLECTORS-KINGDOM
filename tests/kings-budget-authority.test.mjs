import test from "node:test";
import assert from "node:assert/strict";
import { BudgetAuthority } from "../packages/kings-core/src/budget-authority.mjs";

test("KINGS parent budget authority validates and enforces collector job budgets", () => {
  const authority = new BudgetAuthority();
  const budget = { maxTimeMs: 5_000, maxTokens: 2_000, maxIterations: 4 };
  assert.deepEqual(authority.validateBudget(budget), { allowed: true, reasons: [] });
  assert.deepEqual(authority.evaluate(budget, {
    elapsedMs: 1_000,
    tokensUsed: 800,
    iterationsUsed: 2
  }), { allowed: true, reasons: [] });

  const denied = authority.evaluate(budget, {
    elapsedMs: 5_001,
    tokensUsed: 2_001,
    iterationsUsed: 5
  });
  assert.equal(denied.allowed, false);
  assert.equal(denied.reasons.length, 3);
  assert.throws(
    () => authority.assertAllowed(budget, { elapsedMs: 5_001, tokensUsed: 1, iterationsUsed: 1 }),
    /Time budget exceeded/
  );
});

test("KINGS parent budget authority rejects invalid budgets before execution", () => {
  const authority = new BudgetAuthority();
  const decision = authority.validateBudget({ maxTimeMs: 0, maxTokens: Number.NaN, maxIterations: -1 });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reasons.length, 3);
});
