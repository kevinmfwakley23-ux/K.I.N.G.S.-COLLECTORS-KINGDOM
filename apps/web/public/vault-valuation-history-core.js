function byDateDesc(left, right) {
  const dateOrder = String(right.date ?? "").localeCompare(String(left.date ?? ""));
  if (dateOrder) return dateOrder;
  return String(right.recordedAt ?? "").localeCompare(String(left.recordedAt ?? ""));
}

function correctionsByTarget(events) {
  const map = new Map();
  for (const event of events) {
    if (event?.eventType !== "correction" || !event.correctsEventId) continue;
    const list = map.get(event.correctsEventId) ?? [];
    list.push(event);
    list.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id)));
    map.set(event.correctsEventId, list);
  }
  return map;
}

function resolveSale(sale, correctionMap) {
  const chain = [sale];
  let current = sale;
  const visited = new Set([sale.id]);
  while (true) {
    const candidates = correctionMap.get(current.id) ?? [];
    if (candidates.length === 0) break;
    if (candidates.length > 1) {
      return {
        status: "ambiguous-correction",
        sale,
        chain,
        competingCorrectionIds: candidates.map((candidate) => candidate.id)
      };
    }
    const next = candidates[0];
    if (visited.has(next.id)) {
      return { status: "invalid-correction-cycle", sale, chain, competingCorrectionIds: [next.id] };
    }
    visited.add(next.id);
    chain.push(next);
    current = next;
  }

  if (current.eventType === "sold") {
    if (!Number.isSafeInteger(current.amountCents) || current.amountCents <= 0 || !current.currency || !current.effectiveDate) {
      return { status: "missing-financial-facts", sale, chain, competingCorrectionIds: [] };
    }
    return {
      status: "active",
      sale,
      chain,
      effectiveRecord: current,
      amountCents: current.amountCents,
      currency: current.currency,
      date: current.effectiveDate
    };
  }

  if (!Number.isSafeInteger(current.amountCents) || current.amountCents <= 0 || !current.currency) {
    return { status: "corrected-without-financial-facts", sale, chain, competingCorrectionIds: [] };
  }

  return {
    status: "active-correction",
    sale,
    chain,
    effectiveRecord: current,
    amountCents: current.amountCents,
    currency: current.currency,
    date: current.effectiveDate ?? sale.effectiveDate ?? null
  };
}

export function buildValuationHistory({ evidence = [], provenanceEvents = [] } = {}) {
  const correctedEvidenceIds = new Set(evidence.map((item) => item?.correctsEvidenceId).filter(Boolean));
  const activeEvidence = evidence.filter((item) => item && !item.corrected && !correctedEvidenceIds.has(item.id));
  const marketEvidence = activeEvidence.map((item) => Object.freeze({
    kind: item.evidenceType === "sold-comparable" ? "market-sold-comparable" : "market-asking-listing",
    date: item.observedDate,
    recordedAt: item.createdAt,
    amountCents: item.amountCents,
    currency: item.currency,
    evidenceId: item.id,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl ?? null,
    itemState: item.itemState,
    conditionLabel: item.conditionLabel ?? null,
    gradingCompany: item.gradingCompany ?? null,
    gradeLabel: item.gradeLabel ?? null,
    influencesEstimate: item.evidenceType === "sold-comparable",
    authoritativeSaleFact: false
  })).sort(byDateDesc);

  const correctionMap = correctionsByTarget(provenanceEvents);
  const saleEvents = provenanceEvents.filter((event) => event?.eventType === "sold");
  const realizedSales = [];
  const unresolvedSales = [];

  for (const sale of saleEvents) {
    const resolved = resolveSale(sale, correctionMap);
    if ((resolved.status === "active" || resolved.status === "active-correction") && resolved.date) {
      realizedSales.push(Object.freeze({
        kind: "realized-sale",
        date: resolved.date,
        recordedAt: resolved.effectiveRecord.createdAt,
        amountCents: resolved.amountCents,
        currency: resolved.currency,
        provenanceEventId: resolved.effectiveRecord.id,
        originalSaleEventId: sale.id,
        correctionChainIds: Object.freeze(resolved.chain.slice(1).map((event) => event.id)),
        counterparty: resolved.effectiveRecord.counterparty ?? sale.counterparty ?? null,
        method: resolved.effectiveRecord.method ?? sale.method ?? null,
        reference: resolved.effectiveRecord.reference ?? sale.reference ?? null,
        sourceUrl: resolved.effectiveRecord.sourceUrl ?? sale.sourceUrl ?? null,
        evidenceClass: resolved.effectiveRecord.evidenceClass ?? sale.evidenceClass ?? "collector-recorded",
        authoritativeSaleFact: true,
        influencesMarketEstimate: false
      }));
    } else {
      unresolvedSales.push(Object.freeze({
        originalSaleEventId: sale.id,
        status: resolved.status,
        correctionChainIds: Object.freeze(resolved.chain.slice(1).map((event) => event.id)),
        competingCorrectionIds: Object.freeze(resolved.competingCorrectionIds ?? [])
      }));
    }
  }
  realizedSales.sort(byDateDesc);

  const timeline = [...marketEvidence, ...realizedSales].sort(byDateDesc);
  const currencies = Object.freeze([...new Set(timeline.map((item) => item.currency).filter(Boolean))].sort());

  return Object.freeze({
    marketEvidence: Object.freeze(marketEvidence),
    realizedSales: Object.freeze(realizedSales),
    unresolvedSales: Object.freeze(unresolvedSales),
    timeline: Object.freeze(timeline),
    currencies,
    policy: Object.freeze({
      marketEvidenceAndRealizedSalesRemainSeparate: true,
      realizedSalesComeOnlyFromProvenance: true,
      askingListingsInfluenceEstimate: false,
      realizedSalesInfluenceMarketEstimate: false,
      crossCurrencyAggregation: false,
      ambiguousCorrectionsAreExcluded: true,
      authoritativeTreasureValueMutated: false
    })
  });
}
