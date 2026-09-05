import { measureBrowserCentering } from "./vault-grading-core.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
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
  let body = {};
  try { body = await response.json(); } catch { body = {}; }
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  if (!response.ok) throw new Error(body.message ?? "The Kingdom could not complete the pre-grade request.");
  return body;
}

function formatTimestamp(value) {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return String(value ?? ""); }
}

function centeringLabel(record) {
  const centering = record?.analysis?.centering;
  if (!centering?.measurement) return "No centering measurement stored";
  return `${centering.side} • H ${centering.measurement.horizontal?.ratioLabel ?? "—"} • V ${centering.measurement.vertical?.ratioLabel ?? "—"}`;
}

export function createVaultGradingPersistenceUi() {
  const gradingPanel = document.querySelector("#ai-pregrade-panel");
  const profile = document.querySelector("#grading-standard-profile");
  const size = document.querySelector("#grading-card-size");
  const side = document.querySelector("#grading-card-side");
  const left = document.querySelector("#grading-border-left");
  const right = document.querySelector("#grading-border-right");
  const top = document.querySelector("#grading-border-top");
  const bottom = document.querySelector("#grading-border-bottom");
  const localImage = document.querySelector("#grading-image-file");
  if (!gradingPanel || !profile || !size || !side || !left || !right || !top || !bottom || document.querySelector("#grading-persistence-panel")) return null;

  const section = node("section", "grading-quality-panel grading-persistence-panel");
  section.id = "grading-persistence-panel";
  section.append(
    node("h3", "", "Save advisory pre-grade evidence"),
    node("p", "muted-copy", "Find the permanent Vault treasure, then append the current centering analysis as a hashed advisory record. Saved analyses are immutable history. They never overwrite the treasure's condition, grade, authenticity or value.")
  );

  const searchForm = node("form", "grading-reference-form grading-pregrade-treasure-search");
  const searchLabel = node("label", "");
  searchLabel.append(node("span", "", "Find treasure by title, maker, series or identifier"));
  const searchInput = document.createElement("input");
  searchInput.id = "grading-pregrade-treasure-query";
  searchInput.type = "search";
  searchInput.maxLength = 240;
  searchLabel.append(searchInput);
  const searchButton = node("button", "dark-button", "Find treasure");
  searchButton.type = "submit";
  searchForm.append(searchLabel, searchButton);
  section.append(searchForm);

  const resultLabel = node("label", "");
  resultLabel.append(node("span", "", "Treasure to receive this advisory record"));
  const treasureSelect = document.createElement("select");
  treasureSelect.id = "grading-pregrade-treasure";
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "Choose a treasure after searching";
  treasureSelect.append(blank);
  resultLabel.append(treasureSelect);
  section.append(resultLabel);

  const status = node("p", "grading-quality-summary", "No treasure selected.");
  section.append(status);

  const actions = node("div", "grading-persistence-actions");
  const save = node("button", "gold-button", "Save current centering analysis");
  save.type = "button";
  save.disabled = true;
  const refresh = node("button", "quiet-button", "Refresh saved history");
  refresh.type = "button";
  refresh.disabled = true;
  actions.append(save, refresh);
  section.append(actions);

  const policy = node("p", "muted-copy", "Persistence scope in this slice: current centering controls plus profile/card-size metadata. Capture-quality, contour, paired-surface, color and autograph results remain live advisory tools until their result objects are separately wired into this recorder.");
  section.append(policy);
  const history = node("div", "grading-pregrade-history");
  section.append(history);

  function selectedTreasureId() { return treasureSelect.value || null; }

  async function searchTreasures(query = "") {
    const params = new URLSearchParams({ pageSize: "50", sort: "title", order: "asc" });
    if (query.trim()) params.set("q", query.trim());
    const result = await api(`/api/vault/query?${params}`);
    treasureSelect.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = result.treasures?.length ? "Choose a matching treasure" : "No matching treasures";
    treasureSelect.append(empty);
    for (const treasure of result.treasures ?? []) {
      const option = document.createElement("option");
      option.value = treasure.id;
      option.textContent = [treasure.title, treasure.series, treasure.variant].filter(Boolean).join(" • ");
      treasureSelect.append(option);
    }
    status.textContent = result.treasures?.length
      ? `${result.treasures.length} matching treasure${result.treasures.length === 1 ? "" : "s"} loaded${result.pageInfo?.hasNext ? " • refine the search for more" : ""}.`
      : "No matching treasure was found. Save the treasure in the Vault before attaching pre-grade evidence.";
    status.className = `grading-quality-summary ${result.treasures?.length ? "pass" : "miss"}`;
    save.disabled = true;
    refresh.disabled = true;
    history.replaceChildren();
  }

  async function loadHistory() {
    const treasureId = selectedTreasureId();
    if (!treasureId) return;
    const result = await api(`/api/grading/treasures/${encodeURIComponent(treasureId)}/pregrade-analyses?limit=20`);
    history.replaceChildren();
    if (!result.analyses?.length) {
      history.append(node("p", "muted-copy", "No saved advisory pre-grade records exist for this treasure yet."));
      return;
    }
    for (const record of result.analyses) {
      const card = node("article", "grading-pregrade-history-card");
      card.append(
        node("strong", "", `${record.standardProfile.toUpperCase()} reference • ${centeringLabel(record)}`),
        node("span", "", formatTimestamp(record.createdAt)),
        node("code", "", record.analysisSha256),
        node("p", "muted-copy", "Append-only advisory evidence • not an official grade • does not authenticate the physical card")
      );
      history.append(card);
    }
  }

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    searchButton.disabled = true;
    searchButton.textContent = "Searching…";
    try { await searchTreasures(searchInput.value); }
    catch (error) { status.textContent = error.message; status.className = "grading-quality-summary miss"; }
    finally { searchButton.disabled = false; searchButton.textContent = "Find treasure"; }
  });

  treasureSelect.addEventListener("change", () => {
    const enabled = Boolean(selectedTreasureId());
    save.disabled = !enabled;
    refresh.disabled = !enabled;
    if (!enabled) {
      status.textContent = "No treasure selected.";
      history.replaceChildren();
      return;
    }
    status.textContent = "Treasure selected. Saving will append evidence only; no treasure field will be overwritten.";
    status.className = "grading-quality-summary pass";
    loadHistory().catch((error) => { status.textContent = error.message; status.className = "grading-quality-summary miss"; });
  });

  refresh.addEventListener("click", () => {
    refresh.disabled = true;
    loadHistory().catch((error) => { status.textContent = error.message; status.className = "grading-quality-summary miss"; }).finally(() => { refresh.disabled = !selectedTreasureId(); });
  });

  save.addEventListener("click", async () => {
    const treasureId = selectedTreasureId();
    if (!treasureId) return;
    let measurement;
    try {
      measurement = measureBrowserCentering({ left: left.value, right: right.value, top: top.value, bottom: bottom.value });
    } catch (error) {
      status.textContent = error.message;
      status.className = "grading-quality-summary miss";
      return;
    }
    save.disabled = true;
    save.textContent = "Saving advisory record…";
    try {
      const limitations = [
        `Browser centering snapshot saved from ${measurement.horizontal.label} horizontal and ${measurement.vertical.label} vertical measurements.`,
        "Current saved record does not contain an overall grade estimate."
      ];
      if (localImage?.files?.[0]) limitations.push("A local card image was used in the Lab but is not linked as private Vault media in this centering-only saved record.");
      const result = await api(`/api/grading/treasures/${encodeURIComponent(treasureId)}/pregrade-analyses`, {
        method: "POST",
        body: JSON.stringify({
          standardProfile: profile.value,
          cardSizeProfile: size.value,
          sourceMediaIds: [],
          centering: {
            side: side.value,
            left: Number(left.value),
            right: Number(right.value),
            top: Number(top.value),
            bottom: Number(bottom.value),
            method: "manual-anchor",
            confidence: localImage?.files?.[0] ? 0.8 : 0.65
          },
          limitations
        })
      });
      status.textContent = `Saved advisory analysis ${result.analysis.id.slice(0, 8)}… • SHA-256 ${result.analysis.analysisSha256.slice(0, 12)}…`;
      status.className = "grading-quality-summary pass";
      await loadHistory();
    } catch (error) {
      status.textContent = error.message;
      status.className = "grading-quality-summary miss";
    } finally {
      save.disabled = !selectedTreasureId();
      save.textContent = "Save current centering analysis";
    }
  });

  gradingPanel.append(section);
  return Object.freeze({ panel: section, searchTreasures, loadHistory });
}

createVaultGradingPersistenceUi();
