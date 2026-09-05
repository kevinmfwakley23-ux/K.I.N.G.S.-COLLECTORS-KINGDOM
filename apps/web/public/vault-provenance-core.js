const LABELS = Object.freeze({
  acquired: "Acquired",
  "ownership-note": "Ownership / provenance note",
  documented: "Supporting document recorded",
  "loaned-out": "Loaned out",
  "loan-returned": "Loan returned",
  sold: "Sold",
  "gifted-out": "Gifted out",
  "traded-out": "Traded out",
  lost: "Lost",
  stolen: "Stolen",
  recovered: "Recovered",
  correction: "Correction"
});

export function provenanceEventLabel(eventType) {
  return LABELS[eventType] ?? String(eventType ?? "Unknown event");
}

export function provenanceEventTypes() {
  return Object.keys(LABELS);
}

export function decimalMoneyToCents(value) {
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

export function formatProvenanceMoney(amountCents, currency) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0 || !currency) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountCents / 100);
  } catch {
    return `${currency} ${(amountCents / 100).toFixed(2)}`;
  }
}

export function provenanceTimelineSummary(event) {
  const parts = [];
  if (event.effectiveDate) parts.push(event.effectiveDate);
  if (event.method) parts.push(event.method.replace(/-/g, " "));
  if (event.counterparty) parts.push(event.counterparty);
  const money = formatProvenanceMoney(event.amountCents, event.currency);
  if (money) parts.push(money);
  if (event.reference) parts.push(`Ref: ${event.reference}`);
  return parts.join(" • ") || "No additional structured details recorded.";
}
