// Canonical parent source:
// kevinmfwakley23-ux/-KINGS-AI@ed645afbc506f84cd145ea35ee0b696786a4da32
// core/workforce/budget-authority.ts

export class BudgetAuthority {
  validateBudget(budget) {
    const reasons = [];
    if (!Number.isFinite(budget?.maxTimeMs) || budget.maxTimeMs <= 0) {
      reasons.push("Budget maxTimeMs must be greater than zero.");
    }
    if (!Number.isFinite(budget?.maxTokens) || budget.maxTokens <= 0) {
      reasons.push("Budget maxTokens must be greater than zero.");
    }
    if (!Number.isFinite(budget?.maxIterations) || budget.maxIterations <= 0) {
      reasons.push("Budget maxIterations must be greater than zero.");
    }
    return { allowed: reasons.length === 0, reasons };
  }

  evaluate(budget, usage) {
    const validation = this.validateBudget(budget);
    if (!validation.allowed) return validation;

    const reasons = [];
    if (usage.elapsedMs > budget.maxTimeMs) {
      reasons.push(`Time budget exceeded: ${usage.elapsedMs}ms > ${budget.maxTimeMs}ms.`);
    }
    if (usage.tokensUsed > budget.maxTokens) {
      reasons.push(`Token budget exceeded: ${usage.tokensUsed} > ${budget.maxTokens}.`);
    }
    if (usage.iterationsUsed > budget.maxIterations) {
      reasons.push(`Iteration budget exceeded: ${usage.iterationsUsed} > ${budget.maxIterations}.`);
    }
    return { allowed: reasons.length === 0, reasons };
  }

  assertAllowed(budget, usage) {
    const decision = this.evaluate(budget, usage);
    if (!decision.allowed) {
      throw new Error(`K.I.N.G.S. Budget Authority: ${decision.reasons.join(" ")}`);
    }
  }
}
