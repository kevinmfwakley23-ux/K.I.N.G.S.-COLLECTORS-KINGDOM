(() => {
  const parameters = new URL(window.location.href).searchParams;

  function ensureValue(selectId, value) {
    if (!value) return;
    const select = document.getElementById(selectId);
    if (!select) return;
    if (![...select.options].some((option) => option.value === value)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    }
    select.value = value;
  }

  function fractionDigits(currency) {
    try {
      return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
    } catch {
      return 2;
    }
  }

  function minorToDisplay(value, currency) {
    if (!/^\d+$/.test(value ?? "") || !currency) return "";
    const digits = fractionDigits(currency);
    if (digits === 0) return String(Number(value));
    return (Number(value) / (10 ** digits)).toFixed(digits);
  }

  const currency = (parameters.get("currency") ?? "").toUpperCase();
  ensureValue("market-category", parameters.get("category") ?? "");
  ensureValue("market-currency", currency);
  ensureValue("market-fulfillment", parameters.get("fulfillment") ?? "");

  const sort = parameters.get("sort");
  const sortSelect = document.getElementById("market-sort");
  if (sortSelect && [...sortSelect.options].some((option) => option.value === sort)) sortSelect.value = sort;

  const min = document.getElementById("market-min-price");
  const max = document.getElementById("market-max-price");
  if (min && currency) min.value = minorToDisplay(parameters.get("minAmountCents"), currency);
  if (max && currency) max.value = minorToDisplay(parameters.get("maxAmountCents"), currency);
})();
