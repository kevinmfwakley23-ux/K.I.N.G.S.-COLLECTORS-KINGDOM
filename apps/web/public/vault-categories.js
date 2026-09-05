let categoryProfiles = [];

function normalize(value) {
  return String(value ?? "").normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function matchProfile(value) {
  const needle = normalize(value);
  if (!needle) return null;
  for (const profile of categoryProfiles) {
    const candidates = [profile.id, profile.label, ...(profile.aliases ?? [])].map(normalize);
    if (candidates.includes(needle)) return profile;
  }
  for (const profile of categoryProfiles) {
    const candidates = [profile.label, ...(profile.aliases ?? [])].map(normalize);
    if (candidates.some((candidate) => candidate && (needle.includes(candidate) || candidate.includes(needle)))) return profile;
  }
  return null;
}

function installHint(input) {
  const label = input.closest("label");
  if (!label) return null;
  let hint = label.querySelector(".category-profile-hint");
  if (!hint) {
    hint = document.createElement("small");
    hint.className = "category-profile-hint";
    hint.setAttribute("aria-live", "polite");
    label.append(hint);
  }
  return hint;
}

function updateHint(input, hint) {
  if (!hint) return;
  const profile = matchProfile(input.value);
  if (!input.value.trim()) {
    hint.textContent = "Choose a suggested collectible family or enter your own category.";
    return;
  }
  if (!profile) {
    hint.textContent = "Custom category accepted. The Kingdom will preserve your category exactly as entered.";
    return;
  }
  const fieldNames = (profile.fields ?? []).slice(0, 6).map((field) => field.label);
  hint.textContent = fieldNames.length
    ? `${profile.label}: the Vault can also preserve details such as ${fieldNames.join(", ")}${profile.fields.length > fieldNames.length ? ", and more" : ""}.`
    : `${profile.label} profile recognized.`;
}

async function installCategoryIntelligence() {
  const input = document.querySelector("#treasure-category");
  const datalist = document.querySelector("#category-suggestions");
  if (!input || !datalist) return;
  const hint = installHint(input);

  try {
    const response = await fetch("/api/vault/categories", { credentials: "same-origin", headers: { Accept: "application/json" } });
    if (response.status === 401) return;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message ?? "Category guidance is unavailable.");
    categoryProfiles = Array.isArray(body.categories) ? body.categories : [];

    const existing = new Set([...datalist.options].map((option) => normalize(option.value)));
    for (const profile of categoryProfiles) {
      if (existing.has(normalize(profile.label))) continue;
      const option = document.createElement("option");
      option.value = profile.label;
      datalist.append(option);
      existing.add(normalize(profile.label));
    }
    updateHint(input, hint);
  } catch {
    if (hint) hint.textContent = "Custom categories remain available even while category guidance is offline.";
  }

  input.addEventListener("input", () => updateHint(input, hint));
  input.addEventListener("change", () => updateHint(input, hint));
}

installCategoryIntelligence();
