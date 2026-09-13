const DETAIL_LINK_ATTRIBUTE = "data-listing-detail-link";

function addListingDetailLinks(root = document) {
  for (const card of root.querySelectorAll?.("article.marketplace-card[data-listing-id]") ?? []) {
    const listingId = String(card.dataset.listingId ?? "").trim();
    if (!listingId || card.querySelector(`[${DETAIL_LINK_ATTRIBUTE}]`)) continue;
    const actions = card.querySelector(".marketplace-card-actions") ?? card;
    const link = document.createElement("a");
    link.className = "marketplace-secondary-link";
    link.setAttribute(DETAIL_LINK_ATTRIBUTE, "true");
    link.href = `/marketplace-listing.html?id=${encodeURIComponent(listingId)}`;
    link.textContent = "View listing details";
    actions.prepend(link);
  }
}

addListingDetailLinks();

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      if (node.matches("article.marketplace-card[data-listing-id]")) addListingDetailLinks(node.parentElement ?? document);
      else if (node.querySelector?.("article.marketplace-card[data-listing-id]")) addListingDetailLinks(node);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
