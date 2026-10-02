const DETAIL_LINK_ATTRIBUTE = "data-listing-detail-link";
const OBSERVATORY_LINK_ATTRIBUTE = "data-market-observatory-link";
const TRANSACTION_LINK_ATTRIBUTE = "data-market-transactions-link";

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

function addMarketplaceNavigation(root = document) {
  const navigation = root.querySelector?.(".marketplace-header nav");
  if (!navigation) return;
  if (!navigation.querySelector(`[${OBSERVATORY_LINK_ATTRIBUTE}]`)) {
    const observatory = document.createElement("a");
    observatory.href = "/marketplace-observatory.html";
    observatory.textContent = "Market Observatory";
    observatory.setAttribute(OBSERVATORY_LINK_ATTRIBUTE, "true");
    navigation.append(observatory);
  }
  if (!navigation.querySelector(`[${TRANSACTION_LINK_ATTRIBUTE}]`)) {
    const transactions = document.createElement("a");
    transactions.href = "/marketplace-transactions.html";
    transactions.textContent = "Orders & Payments";
    transactions.setAttribute(TRANSACTION_LINK_ATTRIBUTE, "true");
    navigation.append(transactions);
  }
}

addListingDetailLinks();
addMarketplaceNavigation();

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
