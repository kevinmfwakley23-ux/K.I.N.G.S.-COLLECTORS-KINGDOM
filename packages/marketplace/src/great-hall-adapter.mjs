function marketplaceRoom(room) {
  if (room.id !== "marketplace") return room;
  return Object.freeze({
    ...room,
    status: "available",
    href: "/marketplace.html",
    description: "The Kingdom Street Market is open for real Vault-linked fixed-price listing publication and public discovery. Checkout and ownership transfer remain unavailable until their safeguarded transaction phases are implemented."
  });
}

function marketplaceQuickActions(actions) {
  const source = Array.isArray(actions) ? actions : [];
  if (source.some((action) => action.id === "marketplace")) return source;
  const vaultIndex = source.findIndex((action) => action.id === "vault");
  const action = Object.freeze({ id: "marketplace", label: "Visit the Kingdom Street Market", href: "/marketplace.html" });
  if (vaultIndex < 0) return Object.freeze([action, ...source]);
  return Object.freeze([...source.slice(0, vaultIndex + 1), action, ...source.slice(vaultIndex + 1)]);
}

export function createMarketplaceGreatHallAdapter({ greatHallService, marketplaceService } = {}) {
  if (!greatHallService || typeof greatHallService.navigation !== "function") {
    throw new TypeError("Marketplace Great Hall adapter requires the Great Hall service.");
  }
  if (!marketplaceService || typeof marketplaceService.browse !== "function") {
    throw new TypeError("Marketplace Great Hall adapter requires the Marketplace service.");
  }

  function navigation(identity) {
    return Object.freeze(greatHallService.navigation(identity).map(marketplaceRoom));
  }

  function snapshot(identity) {
    const base = greatHallService.snapshot(identity);
    const listings = marketplaceService.browse({ limit: 6 });
    return Object.freeze({
      ...base,
      navigation: navigation(identity),
      marketplaceHighlights: Object.freeze({
        available: true,
        items: Object.freeze(listings),
        activeListingCountShown: listings.length,
        checkoutAvailable: false,
        message: listings.length
          ? "Verified published offer representations are visible in the Kingdom Street Market. Checkout and ownership transfer are not enabled yet."
          : "The Kingdom Street Market is open. No active published listings are available right now."
      }),
      quickActions: marketplaceQuickActions(base.quickActions)
    });
  }

  function keeperRouteRequest(identity, input = {}) {
    const routed = greatHallService.keeperRouteRequest(identity, input);
    const activeCount = marketplaceService.browse({ limit: 100 }).length;
    const messages = routed.messages.map((message, index) => {
      if (index !== 0 || message.role !== "system") return message;
      let content = message.content.replace("Marketplace: planned", "Marketplace: available");
      if (input.roomId === "marketplace") content = content.replace("Location status: planned.", "Location status: available.");
      content += `\nVerified Marketplace summary: ${activeCount} active published listing${activeCount === 1 ? "" : "s"} are visible. Listing publication is real; checkout, payment, buyer protection, settlement, shipment tracking, disputes, and ownership transfer are not yet enabled.`;
      return Object.freeze({ ...message, content });
    });
    return Object.freeze({ ...routed, messages: Object.freeze(messages) });
  }

  return Object.freeze({ navigation, snapshot, keeperRouteRequest });
}
