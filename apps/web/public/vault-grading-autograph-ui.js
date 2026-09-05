import { compareAutographImages } from "./vault-grading-autograph-core.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function sampleImage(image, maxSide = 520) {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(16, Math.round(image.naturalWidth * scale));
  const height = Math.max(16, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot create the autograph-analysis canvas.");
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

function loadLocalImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The autograph image could not be decoded by this browser."));
    };
    image.src = url;
  });
}

function loadProtectedReferenceImage(proxyUrl) {
  const resolved = new URL(proxyUrl, window.location.origin);
  if (resolved.origin !== window.location.origin || resolved.pathname !== "/api/grading/autograph-reference-image") {
    throw new Error("Reference image URL is outside the protected Kingdom grading proxy.");
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A selected web reference image could not be loaded through the protected Kingdom proxy."));
    image.src = resolved.toString();
  });
}

function percent(value) {
  return `${Math.round(Number(value) * 1000) / 10}%`;
}

function candidateCard(candidate, selected) {
  const article = node("article", "grading-reference-candidate");
  const heading = node("div", "grading-reference-candidate-heading");
  const choose = document.createElement("input");
  choose.type = "checkbox";
  choose.value = candidate.referenceId;
  choose.dataset.referenceId = candidate.referenceId;
  choose.setAttribute("aria-label", `Use ${candidate.label ?? candidate.fileTitle} as a visual reference`);
  const title = node("strong", "", candidate.label ?? candidate.fileTitle);
  heading.append(choose, title);
  article.append(heading);

  const image = document.createElement("img");
  image.src = candidate.imageProxyUrl;
  image.alt = `Public web reference candidate: ${candidate.label ?? candidate.fileTitle}`;
  image.loading = "lazy";
  article.append(image);

  const meta = node("div", "grading-reference-meta");
  meta.append(
    node("span", "", candidate.license?.name ? `License: ${candidate.license.name}` : "License metadata unavailable"),
    node("span", "", candidate.license?.artist ? `Credit: ${candidate.license.artist}` : "Credit metadata unavailable"),
    node("span", "", "Public candidate • signer identity not independently confirmed")
  );
  article.append(meta);

  const source = document.createElement("a");
  source.href = candidate.sourceUrl;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.className = "text-link";
  source.textContent = "Review source & license";
  article.append(source);

  choose.addEventListener("change", () => {
    if (choose.checked) selected.set(candidate.referenceId, candidate);
    else selected.delete(candidate.referenceId);
    document.dispatchEvent(new CustomEvent("kingdom:grading-autograph-selection", { detail: { count: selected.size } }));
  });
  return article;
}

export function createVaultGradingAutographUi() {
  const gradingPanel = document.querySelector("#ai-pregrade-panel");
  if (!gradingPanel || document.querySelector("#grading-autograph-panel")) return null;

  const section = node("section", "grading-quality-panel grading-autograph-panel");
  section.id = "grading-autograph-panel";
  section.append(
    node("h3", "", "Autograph web-reference comparison"),
    node("p", "muted-copy", "Scan or upload a tight autograph crop, search public web reference candidates for the claimed signer, review each candidate's source/license, then choose the exemplars you want the Kingdom to compare. The result is visual similarity only — never professional authentication.")
  );

  const searchForm = node("form", "grading-reference-form grading-autograph-search-form");
  const signerLabel = node("label", "");
  signerLabel.append(node("span", "", "Claimed signer"));
  const signer = document.createElement("input");
  signer.id = "grading-autograph-signer";
  signer.maxLength = 120;
  signer.required = true;
  signer.placeholder = "Example: Michael Jordan";
  signerLabel.append(signer);
  const searchButton = node("button", "dark-button", "Find public reference candidates");
  searchButton.type = "submit";
  searchForm.append(signerLabel, searchButton);
  section.append(searchForm);

  const targetLabel = node("label", "grading-file-label grading-autograph-target");
  targetLabel.append(node("span", "", "Autograph scan / tight signature crop"));
  const targetFile = document.createElement("input");
  targetFile.id = "grading-autograph-file";
  targetFile.type = "file";
  targetFile.accept = "image/jpeg,image/png,image/webp,image/avif";
  targetLabel.append(targetFile);
  section.append(targetLabel);

  const searchStatus = node("p", "grading-quality-summary", "No web reference search performed.");
  const candidateList = node("div", "grading-reference-candidates");
  const selected = new Map();
  section.append(searchStatus, candidateList);

  const compareButton = node("button", "gold-button", "Compare selected references");
  compareButton.type = "button";
  compareButton.disabled = true;
  section.append(compareButton);

  const resultSummary = node("p", "grading-quality-summary", "No autograph comparison performed.");
  const resultMetrics = node("div", "grading-quality-metrics");
  const resultList = node("div", "grading-autograph-results");
  const limitations = node("ul", "grading-quality-warnings");
  section.append(resultSummary, resultMetrics, resultList, limitations);

  document.addEventListener("kingdom:grading-autograph-selection", (event) => {
    compareButton.disabled = !targetFile.files?.[0] || Number(event.detail?.count ?? 0) < 1;
  });
  targetFile.addEventListener("change", () => {
    compareButton.disabled = !targetFile.files?.[0] || selected.size < 1;
  });

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    selected.clear();
    compareButton.disabled = true;
    candidateList.replaceChildren();
    searchButton.disabled = true;
    searchButton.textContent = "Searching…";
    searchStatus.textContent = "Searching Wikimedia Commons through the protected Kingdom server…";
    searchStatus.className = "grading-quality-summary";
    try {
      const response = await fetch(`/api/grading/autograph-references?signer=${encodeURIComponent(signer.value)}`, {
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? `Reference search failed with HTTP ${response.status}.`);
      const candidates = Array.isArray(payload.result?.candidates) ? payload.result.candidates : [];
      searchStatus.textContent = candidates.length
        ? `${candidates.length} public reference candidate${candidates.length === 1 ? "" : "s"} found. Review source/license and select only relevant signature exemplars.`
        : "No usable public signature references were found for this search. Try the full signer name or use another professionally sourced exemplar later.";
      searchStatus.className = `grading-quality-summary ${candidates.length ? "pass" : "miss"}`;
      candidateList.replaceChildren(...candidates.map((candidate) => candidateCard(candidate, selected)));
    } catch (error) {
      searchStatus.textContent = error.message;
      searchStatus.className = "grading-quality-summary miss";
    } finally {
      searchButton.disabled = false;
      searchButton.textContent = "Find public reference candidates";
    }
  });

  compareButton.addEventListener("click", async () => {
    const target = targetFile.files?.[0];
    const references = [...selected.values()].slice(0, 8);
    if (!target || !references.length) return;
    compareButton.disabled = true;
    compareButton.textContent = "Comparing…";
    resultMetrics.replaceChildren();
    resultList.replaceChildren();
    limitations.replaceChildren();
    let targetUrl = null;
    try {
      const targetLoaded = await loadLocalImage(target);
      targetUrl = targetLoaded.url;
      const targetPixels = sampleImage(targetLoaded.image);
      const sampledReferences = [];
      for (const candidate of references) {
        const image = await loadProtectedReferenceImage(candidate.imageProxyUrl);
        const pixels = sampleImage(image);
        sampledReferences.push({
          width: pixels.width,
          height: pixels.height,
          data: pixels.data,
          sourceUrl: candidate.sourceUrl,
          label: candidate.label ?? candidate.fileTitle,
          license: candidate.license ?? null
        });
      }
      const result = compareAutographImages({
        target: { width: targetPixels.width, height: targetPixels.height, data: targetPixels.data },
        references: sampledReferences
      });
      if (!result.analyzed) throw new Error(result.reason ?? "The autograph comparison could not be completed from the supplied crops.");

      resultSummary.textContent = `AI visual similarity: ${percent(result.aggregateSimilarity)} • confidence ${percent(result.confidence)} • ${result.usableReferenceCount}/${result.referenceCount} references usable`;
      resultSummary.className = "grading-quality-summary pass";
      resultMetrics.replaceChildren(
        (() => { const row = node("div", "grading-quality-row"); row.append(node("span", "", "Authentication status"), node("strong", "", "NOT AUTHENTICATED")); return row; })(),
        (() => { const row = node("div", "grading-quality-row"); row.append(node("span", "", "Method"), node("strong", "", result.method)); return row; })()
      );
      for (const reference of [...result.references].sort((a, b) => (b.similarity ?? -1) - (a.similarity ?? -1))) {
        const item = node("article", "grading-contour-signal");
        item.append(
          node("strong", "", reference.label ?? "Reference"),
          node("span", "", reference.usable ? `visual similarity ${percent(reference.similarity)}` : "reference crop unusable"),
          node("p", "muted-copy", reference.usable ? `shape ${percent(reference.components.grid)} • horizontal ${percent(reference.components.xProjection)} • vertical ${percent(reference.components.yProjection)} • aspect ${percent(reference.components.aspect)}` : reference.reason)
        );
        resultList.append(item);
      }
      limitations.replaceChildren(
        node("li", "", "Wikimedia Commons search results are public web candidates, not authenticated exemplar records. The collector must review signer identity, source and license."),
        ...result.limitations.map((text) => node("li", "", text)),
        node("li", "", "A high visual-similarity score cannot establish authenticity. Professional autograph authentication remains a separate authority.")
      );
    } catch (error) {
      resultSummary.textContent = error.message;
      resultSummary.className = "grading-quality-summary miss";
    } finally {
      if (targetUrl) URL.revokeObjectURL(targetUrl);
      compareButton.disabled = !targetFile.files?.[0] || selected.size < 1;
      compareButton.textContent = "Compare selected references";
    }
  });

  gradingPanel.append(section);
  return Object.freeze({ panel: section });
}

createVaultGradingAutographUi();
