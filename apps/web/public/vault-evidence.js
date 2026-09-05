function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function formatDate(value) {
  if (!value) return "Date not recorded";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function labelForKind(kind) {
  return String(kind ?? "other").split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");
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
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Vault evidence could not be updated.");
  return body;
}

function field(labelText, control, className = "") {
  const label = element("label", className);
  label.append(element("span", "", labelText), control);
  return label;
}

function optionList(select, kinds, selected) {
  select.replaceChildren();
  for (const kind of kinds) select.append(new Option(labelForKind(kind), kind));
  if (selected && kinds.includes(selected)) select.value = selected;
}

function safeHeaderFilename(name) {
  const clean = String(name ?? "evidence").replace(/[^A-Za-z0-9._ -]/g, "_").replace(/\s+/g, " ").trim();
  return (clean || "evidence").slice(0, 180);
}

export async function createEvidenceSection(treasureId) {
  const section = element("section", "evidence-section");
  section.dataset.treasureId = treasureId;

  const heading = element("div", "evidence-heading");
  const headingCopy = document.createElement("div");
  headingCopy.append(
    element("p", "eyebrow", "Evidence Cabinet"),
    element("h3", "", "Supporting documents & proof"),
    element("p", "empty-copy", "Attach receipts, certificates, grading paperwork, appraisals, provenance, insurance records, condition reports, and other evidence. Uploaded documents remain collector-supplied and not independently verified unless a future authorized verifier says otherwise.")
  );
  heading.append(headingCopy);
  section.append(heading);

  const status = element("p", "form-status", "Loading supporting evidence…");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  section.append(status);

  const list = element("div", "evidence-list");
  section.append(list);

  const form = element("form", "evidence-upload-form");
  const kindSelect = document.createElement("select");
  const titleInput = document.createElement("input");
  titleInput.maxLength = 160;
  titleInput.placeholder = "e.g. JSA Letter of Authenticity";
  const sourceInput = document.createElement("input");
  sourceInput.maxLength = 180;
  sourceInput.placeholder = "e.g. JSA, auction house, dealer, insurer";
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  const notesInput = document.createElement("textarea");
  notesInput.maxLength = 2000;
  notesInput.rows = 3;
  notesInput.placeholder = "What does this document establish? Add collector context without overstating verification.";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.required = true;
  fileInput.accept = "application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp";
  const submit = element("button", "gold-button compact-button", "Secure evidence");
  submit.type = "submit";
  form.append(
    field("Evidence type", kindSelect),
    field("Title", titleInput),
    field("Source / issuer", sourceInput),
    field("Document date", dateInput),
    field("File", fileInput, "evidence-file-field"),
    field("Collector notes", notesInput, "evidence-notes-field"),
    element("p", "evidence-trust-note", "Security rule: the Kingdom records the exact file hash and source you provide, but an upload alone does not turn a certificate, appraisal, or authentication claim into a verified fact."),
    submit
  );
  section.append(form);

  let kinds = [];
  let maximumBytes = 20 * 1024 * 1024;

  async function updateMetadata(item, input) {
    const result = await api(`/api/vault/evidence/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    return result.evidence;
  }

  function renderItem(item) {
    const card = element("article", "evidence-card");
    const top = element("div", "evidence-card-top");
    const copy = element("div", "evidence-card-copy");
    copy.append(
      element("strong", "", item.title),
      element("span", "", `${labelForKind(item.kind)} • ${formatBytes(item.byteSize)}${item.documentDate ? ` • ${formatDate(item.documentDate)}` : ""}`)
    );
    if (item.sourceLabel) copy.append(element("span", "", `Source: ${item.sourceLabel}`));
    if (item.notes) copy.append(element("p", "", item.notes));

    const badges = element("div", "evidence-badges");
    badges.append(
      element("span", "trust-badge", "Collector uploaded"),
      element("span", "trust-badge trust-badge-unchecked", "Not independently checked")
    );
    top.append(copy, badges);

    const integrity = element("p", "evidence-integrity", `SHA-256 ${item.sha256}`);
    const actions = element("div", "evidence-actions");
    const download = element("a", "quiet-button compact-button", "Download exact file");
    download.href = item.href;
    const editToggle = element("button", "quiet-button compact-button", "Edit details");
    editToggle.type = "button";
    const remove = element("button", "danger-button compact-button", "Remove evidence");
    remove.type = "button";
    actions.append(download, editToggle, remove);

    const editForm = element("form", "evidence-edit-form");
    editForm.hidden = true;
    const editKind = document.createElement("select");
    optionList(editKind, kinds, item.kind);
    const editTitle = document.createElement("input");
    editTitle.value = item.title;
    editTitle.maxLength = 160;
    editTitle.required = true;
    const editSource = document.createElement("input");
    editSource.value = item.sourceLabel ?? "";
    editSource.maxLength = 180;
    const editDate = document.createElement("input");
    editDate.type = "date";
    editDate.value = item.documentDate ?? "";
    const editNotes = document.createElement("textarea");
    editNotes.value = item.notes ?? "";
    editNotes.maxLength = 2000;
    editNotes.rows = 3;
    const save = element("button", "gold-button compact-button", "Save evidence details");
    save.type = "submit";
    editForm.append(
      field("Evidence type", editKind),
      field("Title", editTitle),
      field("Source / issuer", editSource),
      field("Document date", editDate),
      field("Collector notes", editNotes, "evidence-notes-field"),
      save
    );

    editToggle.addEventListener("click", () => {
      editForm.hidden = !editForm.hidden;
      if (!editForm.hidden) editTitle.focus();
    });

    editForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      save.disabled = true;
      status.textContent = "Updating evidence details…";
      try {
        await updateMetadata(item, {
          kind: editKind.value,
          title: editTitle.value,
          sourceLabel: editSource.value || null,
          documentDate: editDate.value || null,
          notes: editNotes.value || null
        });
        await load();
        status.textContent = "Evidence details updated. Verification status was not changed.";
      } catch (error) {
        status.textContent = error.message;
      } finally {
        save.disabled = false;
      }
    });

    remove.addEventListener("click", async () => {
      if (!window.confirm(`Remove “${item.title}” from this treasure's evidence cabinet? This deletes the stored evidence file, not the treasure.`)) return;
      remove.disabled = true;
      status.textContent = "Removing supporting evidence…";
      try {
        await api(`/api/vault/evidence/${encodeURIComponent(item.id)}`, { method: "DELETE" });
        await load();
        status.textContent = "Supporting evidence removed.";
      } catch (error) {
        status.textContent = error.message;
        remove.disabled = false;
      }
    });

    card.append(top, integrity, actions, editForm);
    return card;
  }

  async function load() {
    const result = await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/evidence`);
    kinds = Array.isArray(result.kinds) ? result.kinds : [];
    maximumBytes = Number.isInteger(result.maximumBytes) ? result.maximumBytes : maximumBytes;
    optionList(kindSelect, kinds, kindSelect.value || kinds[0]);
    list.replaceChildren();
    if (!(result.evidence ?? []).length) {
      list.append(element("p", "evidence-empty", "No supporting documents are attached yet."));
    } else {
      for (const item of result.evidence) list.append(renderItem(item));
    }
    status.textContent = "";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > maximumBytes) {
      status.textContent = `Evidence files must be ${(maximumBytes / (1024 * 1024)).toFixed(0)} MB or smaller.`;
      return;
    }
    submit.disabled = true;
    status.textContent = "Securing exact evidence bytes and integrity hash…";
    try {
      const response = await fetch(`/api/vault/treasures/${encodeURIComponent(treasureId)}/evidence`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": file.type || "application/octet-stream",
          "X-Evidence-Kind": kindSelect.value,
          "X-File-Name": safeHeaderFilename(file.name)
        },
        body: file
      });
      if (response.status === 401) {
        window.location.assign("/auth.html");
        return;
      }
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message ?? "Evidence could not be secured.");
      let stored = body.evidence;
      const metadata = {
        title: titleInput.value || stored.title,
        sourceLabel: sourceInput.value || null,
        documentDate: dateInput.value || null,
        notes: notesInput.value || null
      };
      if (metadata.title !== stored.title || metadata.sourceLabel || metadata.documentDate || metadata.notes) {
        stored = await updateMetadata(stored, metadata);
      }
      form.reset();
      optionList(kindSelect, kinds, kinds[0]);
      await load();
      status.textContent = `Evidence secured with SHA-256 ${stored.sha256.slice(0, 12)}… and marked not independently checked.`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });

  try {
    await load();
  } catch (error) {
    status.textContent = error.message;
    form.hidden = true;
  }

  return section;
}
