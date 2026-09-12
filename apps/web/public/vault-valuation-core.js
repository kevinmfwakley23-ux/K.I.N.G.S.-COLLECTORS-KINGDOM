export function decimalValuationMoneyToCents(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const text = String(value).trim();
  if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(text)) {
    throw new TypeError("Amount must be a non-negative number with no more than two decimal places.");
  }
  const [whole, fraction = ""] = text.split(".");
  const cents = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new TypeError("Amount is too large to store safely.");
  return Number(cents);
}

export function formatValuationMoney(amountCents, currency) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0 || !currency) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountCents / 100);
  } catch {
    return `${currency} ${(amountCents / 100).toFixed(2)}`;
  }
}

export function valuationBucketLabel(context = {}) {
  const parts = [String(context.currency ?? "").toUpperCase(), String(context.itemState ?? "unknown")];
  if (context.itemState === "graded") {
    if (context.gradingCompany) parts.push(context.gradingCompany);
    if (context.gradeLabel) parts.push(context.gradeLabel);
  } else if (context.conditionLabel) {
    parts.push(context.conditionLabel);
  }
  return parts.filter(Boolean).join(" • ");
}

export function valuationEvidenceTypeLabel(type) {
  if (type === "sold-comparable") return "Sold comparable";
  if (type === "asking-listing") return "Asking listing";
  return String(type ?? "Evidence");
}

export function valuationEstimateHeadline(bucket) {
  if (!bucket?.estimateAvailable || !bucket.estimate) return "No estimate yet";
  return formatValuationMoney(bucket.estimate.medianCents, bucket.estimate.currency);
}

export function valuationEstimateDetail(bucket) {
  if (!bucket?.estimateAvailable || !bucket.estimate) {
    const count = Number(bucket?.recentSoldComparableCount ?? 0);
    const required = Number(bucket?.minimumRecentSoldComparables ?? 3);
    return `${count} of ${required} recent sold comparables recorded.`;
  }
  const estimate = bucket.estimate;
  return `${formatValuationMoney(estimate.lowCents, estimate.currency)} – ${formatValuationMoney(estimate.highCents, estimate.currency)} • ${estimate.sampleCount} recent sold comps • ${estimate.confidence} evidence strength`;
}
