function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function normalize(value) {
  return String(value ?? "").normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {})
    }
  });
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok) throw new Error(body.message ?? "The Vault could not update collectible details.");
  return body;
}

function matchProfile(category, profiles) {
  const needle = normalize(category);
  if (!needle) return null;
  for (const profile of profiles) {
    const candidates = [profile.id, profile.label, ...(profile.aliases ?? [])].map(normalize);
    if (candidates.includes(needle)) return profile;
  }
  for (const profile of profiles) {
    const candidates = [profile.label, ...(profile.aliases ?? [])].map(normalize);
    if (candidates.some((candidate) => candidate && (needle.includes(candidate) || candidate.includes(needle)))) return profile;
  }
  return null;
}

function valueText(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "Not recorded";
  return String(value);
}

function installStyles() {
  if (document.querySelector('link[href="/vault-details.css"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/vault-details.css";
  document.head.append(link);
}

export async function createCollectibleDetailsSection(treasureId) {
  installStyles();
  const section = element("section", "collectible-details-section");
  const heading = element("div", "collectible-details-heading");
  const copy = document.createElement("div");
  copy.append(element("h3", "", "Collectible-specific details"));
  const description = element("p", "empty-copy", "Loading category intelligence and saved details…");
  copy.append(description);
  heading.append(copy);
  section.append(heading);

  const status = element("p", "form-status", "");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  section.append(status);

  const list = element("div", "collectible-detail-list");
  section.append(list);

  const form = element("form", "collectible-detail-form");
  form.hidden = true;
  const fieldLabel = element("label", "");
  fieldLabel.append(element("span", "", "Detail"));
  const fieldSelect = document.createElement("select");
  fieldLabel.append(fieldSelect);

  const customKeyLabel = element("label", "collectible-custom-field");
  customKeyLabel.hidden = true;
  customKeyLabel.append(element("span", "", "Custom field name"));
  const customLabel = document.createElement("input");
  customLabel.maxLength = 100;
  customLabel.placeholder = "Edition note, designer, catalog ID…";
  customKeyLabel.append(customLabel);

  const valueLabel = element("label", "collectible-value-field");
  valueLabel.append(element("span", "", "Value"));
  const valueHost = element("div", "collectible-value-host");
  valueLabel.append(valueHost);

  const providerLabel = element("label", "");
  providerLabel.append(element("span", "", "Verification provider (optional)"));
  const provider = document.createElement("input");
  provider.maxLength = 100;
  provider.placeholder = "PSA, NGC, JSA, Beckett…";
  providerLabel.append(provider);

  const referenceLabel = element("label", "");
  referenceLabel.append(element("span", "", "Cert / source reference (optional)"));
  const reference = document.createElement("input");
  reference.maxLength = 500;
  reference.placeholder = "Certificate number, LOA reference, source ID…";
  referenceLabel.append(reference);

  const submit = element("button", "gold-button compact-button", "Save detail");
  submit.type = "submit";
  const trustNote = element("p", "collectible-trust-note", "Collector-entered verification references remain marked “not checked” until a real Kingdom verification service confirms them.");
  form.append(fieldLabel, customKeyLabel, valueLabel, providerLabel, referenceLabel, submit, trustNote);
  section.append(form);

  let profile = null;
  let profiles = [];
  let attributes = [];
  let valueControl = null;

  function selectedField() {
    if (fieldSelect.value === "__custom__") {
      const label = customLabel.value.trim();
      const key = normalize(label).replace(/\s+/g, "_").slice(0, 60);
      return label && key ? { key, label, type: "text" } : null;
    }
    return profile?.fields?.find((field) => field.key === fieldSelect.value) ?? null;
  }

  function renderValueControl() {
    const field = selectedField();
    valueHost.replaceChildren();
    valueControl = null;
    if (!field) return;
    if (field.type === "boolean") {
      const select = document.createElement("select");
      select.append(new Option("Yes", "true"), new Option("No", "false"));
      valueHost.append(select);
      valueControl = select;
      return;
    }
    const input = document.createElement("input");
    input.type = field.type === "date" ? "date" : field.type === "number" ? "number" : "text";
    input.maxLength = field.type === "text" ? 4000 : undefined;
    if (field.hint) input.placeholder = field.hint;
    valueHost.append(input);
    valueControl = input;
  }

  function renderFieldChoices() {
    fieldSelect.replaceChildren();
    for (const field of profile?.fields ?? []) fieldSelect.append(new Option(field.label, field.key));
    fieldSelect.append(new Option("Custom detail…", "__custom__"));
    customKeyLabel.hidden = fieldSelect.value !== "__custom__";
    renderValueControl();
  }

  function renderAttributes() {
    list.replaceChildren();
    if (!attributes.length) {
      list.append(element("p", "empty-copy", "No category-specific details have been saved yet."));
      return;
    }
    for (const attribute of attributes) {
      const row = element("article", "collectible-detail-row");
      const data = element("div", "collectible-detail-copy");
      data.append(element("strong", "", attribute.label), element("span", "", valueText(attribute.value)));
      const evidence = [];
      if (attribute.verificationProvider) evidence.push(attribute.verificationProvider);
      if (attribute.verificationReference) evidence.push(attribute.verificationReference);
      data.append(element("small", "", `${attribute.sourceType} • verification: ${attribute.verificationStatus}${evidence.length ? ` • ${evidence.join(" • ")}` : ""}`));
      const remove = element("button", "manager-delete", "Remove");
      remove.type = "button";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Remove the saved detail “${attribute.label}”?`)) return;
        remove.disabled = true;
        status.textContent = "Removing collectible detail…";
        try {
          await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/attributes/${encodeURIComponent(attribute.key)}`, { method: "DELETE" });
          await loadAttributes();
          status.textContent = "Collectible detail removed.";
        } catch (error) {
          status.textContent = error.message;
          remove.disabled = false;
        }
      });
      row.append(data, remove);
      list.append(row);
    }
  }

  async function loadAttributes() {
    const result = await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/attributes`);
    attributes = result.attributes ?? [];
    renderAttributes();
  }

  try {
    const [{ treasure }, categoryResult] = await Promise.all([
      api(`/api/vault/treasures/${encodeURIComponent(treasureId)}`),
      api("/api/vault/categories")
    ]);
    profiles = categoryResult.categories ?? [];
    profile = matchProfile(treasure.category, profiles);
    description.textContent = profile
      ? `${profile.label} profile recognized. Recommended fields appear below, and you may add your own custom detail at any time.`
      : `“${treasure.category}” is being treated as a custom category. Add any details that matter to this collection.`;
    renderFieldChoices();
    form.hidden = false;
    await loadAttributes();
  } catch (error) {
    status.textContent = error.message;
    description.textContent = "Category-specific details are temporarily unavailable. The treasure record itself remains safe.";
    return section;
  }

  fieldSelect.addEventListener("change", () => {
    customKeyLabel.hidden = fieldSelect.value !== "__custom__";
    renderValueControl();
  });
  customLabel.addEventListener("input", () => {
    if (fieldSelect.value === "__custom__") renderValueControl();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const field = selectedField();
    if (!field) {
      status.textContent = "Choose a collectible detail or name a custom field.";
      return;
    }
    if (!valueControl || String(valueControl.value ?? "").trim() === "") {
      status.textContent = "Enter a value for this collectible detail.";
      return;
    }
    let value = valueControl.value;
    if (field.type === "boolean") value = valueControl.value === "true";
    if (field.type === "number") {
      value = Number(valueControl.value);
      if (!Number.isFinite(value)) {
        status.textContent = "Enter a valid number.";
        return;
      }
    }
    submit.disabled = true;
    status.textContent = "Securing collectible detail…";
    try {
      await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/attributes`, {
        method: "POST",
        body: JSON.stringify({
          key: field.key,
          label: field.label,
          value,
          sourceType: "collector-entered",
          verificationProvider: provider.value || null,
          verificationReference: reference.value || null
        })
      });
      provider.value = "";
      reference.value = "";
      if (fieldSelect.value === "__custom__") customLabel.value = "";
      renderValueControl();
      await loadAttributes();
      status.textContent = "Collectible detail secured.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  return section;
}
