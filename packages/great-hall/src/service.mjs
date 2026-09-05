const ROOM_DEFINITIONS = Object.freeze([
  {
    id: "great-hall",
    name: "Great Hall",
    role: "Kingdom Home",
    zone: "castle",
    environment: "great-hall",
    status: "available",
    href: "/great-hall.html",
    description: "Your central welcome, activity, navigation, and Keeper access point."
  },
  {
    id: "vault",
    name: "Vault",
    role: "Royal Collection Vault",
    zone: "castle",
    environment: "secure-treasure-vault",
    status: "planned",
    href: "/room.html?room=vault",
    description: "A grand secure treasure-vault interior for inventory, provenance, media, condition, value evidence, and precise storage locations arrives in IMP-005."
  },
  {
    id: "marketplace",
    name: "Marketplace",
    role: "Kingdom Street Market",
    zone: "grounds",
    environment: "street-market",
    status: "planned",
    href: "/room.html?room=marketplace",
    description: "Beyond the castle gates, an open-air collector street market for verified buying, selling, trading, merchant stalls, and market discovery opens in the approved marketplace phases."
  },
  {
    id: "library",
    name: "Library",
    role: "Royal Scholar's Library",
    zone: "castle",
    environment: "library",
    status: "planned",
    href: "/room.html?room=library",
    description: "Research, references, guides, provenance sources, and collection knowledge will live here."
  },
  {
    id: "observatory",
    name: "Observatory",
    role: "Royal Market Watch",
    zone: "castle",
    environment: "observatory",
    status: "planned",
    href: "/room.html?room=observatory",
    description: "Market signals, watchlists, release calendars, and trend intelligence will live here."
  },
  {
    id: "war-room",
    name: "War Room",
    role: "Royal Strategy Room",
    zone: "castle",
    environment: "war-room",
    status: "planned",
    href: "/room.html?room=war-room",
    description: "Decision support, acquisition strategy, trade analysis, and collection planning will live here."
  },
  {
    id: "treasury",
    name: "Treasury",
    role: "Royal Value Room",
    zone: "castle",
    environment: "treasury",
    status: "planned",
    href: "/room.html?room=treasury",
    description: "Portfolio value, cost basis, gains and losses, sale history, and financial collection views will live here."
  },
  {
    id: "workshop",
    name: "Artisan's Workshop",
    role: "Royal Project Room",
    zone: "castle",
    environment: "workshop",
    status: "planned",
    href: "/room.html?room=workshop",
    description: "Collector projects, restoration planning, display work, grading preparation, and creative work will live here."
  },
  {
    id: "hall-of-legacy",
    name: "Hall of Legacy",
    role: "Royal History Room",
    zone: "castle",
    environment: "hall-of-legacy",
    status: "planned",
    href: "/room.html?room=hall-of-legacy",
    description: "Stories, ownership history, inheritance, provenance, and long-term preservation will live here."
  },
  {
    id: "royal-chambers",
    name: "Royal Chambers",
    role: "Account & Preferences",
    zone: "castle",
    environment: "royal-chambers",
    status: "planned",
    href: "/room.html?room=royal-chambers",
    description: "Personal settings, privacy controls, remembered preferences, devices, and Kingdom preferences will expand here."
  }
]);

const ACTIVITY_COPY = Object.freeze({
  "identity.account_registered": "Your collector identity joined the Kingdom.",
  "identity.sign_in_succeeded": "A secure sign-in was completed.",
  "identity.sign_in_failed": "An unsuccessful sign-in attempt was recorded.",
  "identity.profile_updated": "Your collector profile was updated.",
  "identity.sign_out": "A Kingdom session was securely signed out."
});

function requireIdentity(identity) {
  if (!identity?.id) throw new TypeError("An authenticated collector identity is required.");
  return identity;
}

function safeDisplayName(identity) {
  const value = typeof identity.displayName === "string" ? identity.displayName.trim() : "";
  return value || "Collector";
}

function mapActivity(event) {
  return Object.freeze({
    type: event.eventType,
    message: ACTIVITY_COPY[event.eventType] ?? "Account activity was recorded.",
    createdAt: event.createdAt
  });
}

function sanitizeHistory(history) {
  if (history === undefined) return [];
  if (!Array.isArray(history)) throw new TypeError("Keeper conversation history must be an array.");
  return history.slice(-8).map((entry) => {
    if (!entry || !["user", "assistant"].includes(entry.role) || typeof entry.content !== "string") {
      throw new TypeError("Keeper conversation history contains an invalid message.");
    }
    const content = entry.content.trim();
    if (!content || content.length > 2000) throw new TypeError("Keeper history messages must contain 1 to 2000 characters.");
    return { role: entry.role, content };
  });
}

function resolveRoom(roomId) {
  const normalized = typeof roomId === "string" && roomId.trim() ? roomId.trim() : "great-hall";
  const room = ROOM_DEFINITIONS.find((candidate) => candidate.id === normalized);
  if (!room) throw new TypeError("The requested Keeper room context is not recognized.");
  return room;
}

function roomContextLine(room) {
  if (room.zone === "grounds") {
    return `Current location: ${room.name}, outside the castle in the Kingdom Street Market grounds. Location status: ${room.status}.`;
  }
  return `Current room: ${room.name}, inside the castle. Room status: ${room.status}.`;
}

export function createGreatHallService({ identityService, now = () => new Date() } = {}) {
  if (!identityService) throw new TypeError("Great Hall requires the identity service.");

  function navigation(identity) {
    requireIdentity(identity);
    return ROOM_DEFINITIONS.map((room) => Object.freeze({ ...room }));
  }

  function recentActivity(identity) {
    requireIdentity(identity);
    if (typeof identityService.listRecentActivity !== "function") return [];
    return identityService.listRecentActivity(identity, { limit: 6 }).map(mapActivity);
  }

  function snapshot(identity) {
    const collector = requireIdentity(identity);
    const activity = recentActivity(collector);
    const signIns = activity.filter((entry) => entry.type === "identity.sign_in_succeeded").length;
    const displayName = safeDisplayName(collector);

    return Object.freeze({
      generatedAt: now().toISOString(),
      greeting: signIns > 1 ? `Welcome back, ${displayName}.` : `Welcome home, ${displayName}.`,
      collector: Object.freeze({
        displayName,
        roles: Array.isArray(collector.roles) ? [...collector.roles] : [],
        emailVerified: Boolean(collector.emailVerified)
      }),
      navigation: navigation(collector),
      collectionOverview: Object.freeze({
        available: false,
        itemCount: null,
        estimatedValue: null,
        message: "Collection totals become authoritative when the Vault opens in IMP-005. No estimated collection data is manufactured before that service exists."
      }),
      marketplaceHighlights: Object.freeze({
        available: false,
        items: [],
        message: "The outdoor Kingdom Street Market will show verified listings and market activity when the approved marketplace service is connected."
      }),
      notifications: Object.freeze({
        available: false,
        unreadCount: null,
        items: [],
        message: "Kingdom notifications will appear when the notification service is implemented."
      }),
      recentActivity: activity,
      quickActions: Object.freeze([
        Object.freeze({ id: "keeper", label: "Call The Keeper", action: "keeper" }),
        Object.freeze({ id: "search", label: "Search the Kingdom", action: "search" }),
        Object.freeze({ id: "profile", label: "Review my profile", href: "/auth.html#account-panel" }),
        Object.freeze({ id: "sessions", label: "Review active sessions", href: "/auth.html#account-panel" })
      ]),
      announcement: Object.freeze({
        title: "The Great Hall is opening in stages.",
        message: "Identity, secure sessions, castle-and-grounds navigation, and The Keeper's Great Hall entry point are live. Rooms and outdoor services still under construction are labeled clearly rather than pretending their services are complete."
      }),
      keeper: Object.freeze({
        name: "The Keeper",
        role: "Royal Assistant, Butler, Servant & Advisor",
        form: "Upright anthropomorphic lion in refined royal service attire",
        endpoint: "/api/keeper/chat"
      })
    });
  }

  function keeperRouteRequest(identity, { message, history, roomId } = {}) {
    const collector = requireIdentity(identity);
    if (typeof message !== "string" || !message.trim()) throw new TypeError("A message for The Keeper is required.");
    const safeMessage = message.trim();
    if (safeMessage.length > 4000) throw new TypeError("Keeper messages must contain at most 4000 characters.");
    const safeHistory = sanitizeHistory(history);
    const currentRoom = resolveRoom(roomId);
    const hall = snapshot(collector);
    const roomStatus = hall.navigation.map((room) => `${room.name}: ${room.status}`).join("; ");
    const activity = hall.recentActivity.map((entry) => entry.message).join(" ") || "No recent account activity is available.";

    return Object.freeze({
      messages: [
        {
          role: "system",
          content: [
            "You are The Keeper, the resident royal assistant, butler, servant, advisor, steward, curator, and guide of K.I.N.G.S. Collector's Kingdom.",
            "You are represented in the Kingdom as an upright anthropomorphic lion who walks on two legs and wears refined formal royal service attire.",
            "Speak as a trusted attendant who is physically present with the collector in the current Kingdom location, not as a detached chatbot or generic support agent.",
            "Be warm, direct, honest, calm, knowledgeable, and useful. Never invent collection records, values, marketplace facts, notifications, provenance, or room capabilities.",
            "When identification, value, market evidence, or Kingdom data is uncertain, say so clearly and prefer verification over confident guessing.",
            "If a Kingdom service is not yet available, say so plainly and help the collector with what is available now.",
            "Do not claim that you executed a purchase, sale, listing, account change, collection edit, memory write, or other product action. Product actions require Collector's Kingdom authorization outside the model.",
            "The collector controls permanent memories and cost/quality routing choices; do not imply otherwise.",
            `Collector display name: ${hall.collector.displayName}.`,
            roomContextLine(currentRoom),
            `Kingdom navigation status: ${roomStatus}.`,
            `Recent verified account activity: ${activity}`
          ].join("\n")
        },
        ...safeHistory,
        { role: "user", content: safeMessage }
      ],
      requiredCapabilities: ["reasoning"],
      maxOutputTokens: 800,
      temperature: 0.4,
      allowToolProposals: false
    });
  }

  return Object.freeze({ navigation, snapshot, keeperRouteRequest });
}
