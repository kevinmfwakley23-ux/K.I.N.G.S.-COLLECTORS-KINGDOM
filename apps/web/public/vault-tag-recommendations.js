function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

async function api(path) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (response.status === 401) {
    window.location.assign("/auth.html");
    throw new Error("Authentication is required.");
  }
  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok) throw new Error(body.message ?? "Royal Curator tag suggestions are unavailable.");
  return body;
}

function strengthLabel(value) {
  if (value === "strong") return "Strong pattern";
  if (value === "moderate") return "Moderate pattern";
  return "Tentative pattern";
}

export async function createTagRecommendationSection(treasureId) {
  const section = element("section", "detail-history tag-recommendation-section");
  section.dataset.treasureId = treasureId;

  const heading = element("div", "tag-recommendation-heading");
  const copy = element("div");
  copy.append(
    element("h3", "", "Royal Curator tag suggestions"),
    element("p", "empty-copy", "Suggestions come only from patterns in your own Vault. The Keeper never applies a tag automatically; you decide what belongs on this treasure.")
  );
  heading.append(copy);
  section.append(heading);

  const status = element("p", "form-status", "Comparing this treasure with your collection…");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  section.append(status);

  const list = element("ul", "tag-recommendation-list");
  section.append(list);

  try {
    const result = await api(`/api/vault/treasures/${encodeURIComponent(treasureId)}/tag-recommendations?limit=6`);
    const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];
    list.replaceChildren();
    if (!recommendations.length) {
      list.append(element("li", "tag-recommendation-empty", "No grounded tag suggestions are available yet. As you tag similar treasures, the Royal Curator can learn your own collection patterns."));
    } else {
      for (const recommendation of recommendations) {
        const item = element("li", "tag-recommendation-item");
        const top = element("div", "tag-recommendation-topline");
        top.append(
          element("strong", "tag-recommendation-tag", recommendation.tag),
          element("span", `tag-recommendation-strength strength-${recommendation.strength ?? "tentative"}`, strengthLabel(recommendation.strength))
        );
        item.append(top, element("p", "", recommendation.explanation));
        list.append(item);
      }
    }
    status.textContent = result.policy?.automaticApplication === false
      ? "Suggestions are advisory only. Edit the treasure record to choose which tags to keep."
      : "Suggestions loaded.";
  } catch (error) {
    list.replaceChildren();
    status.textContent = error.message;
  }

  return section;
}
