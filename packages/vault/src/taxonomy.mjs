const FIELD = (key, label, type = "text", options = {}) => Object.freeze({ key, label, type, ...options });

const PROFILES = [
  {
    id: "sports-cards",
    label: "Sports Cards",
    aliases: ["sports card", "baseball cards", "basketball cards", "football cards", "hockey cards", "soccer cards", "wrestling cards"],
    fields: [
      FIELD("sport", "Sport"), FIELD("player", "Player / Athlete"), FIELD("team", "Team"), FIELD("set", "Set"),
      FIELD("card_number", "Card Number"), FIELD("variant", "Parallel / Variant"), FIELD("serial_number", "Serial Number"),
      FIELD("rookie", "Rookie Card", "boolean"), FIELD("grading_company", "Grading Company"), FIELD("grade", "Grade"),
      FIELD("certification_number", "Certification Number"), FIELD("language", "Language")
    ]
  },
  {
    id: "tcg-cards",
    label: "Trading Card Games (TCG)",
    aliases: ["tcg", "trading cards", "pokemon", "magic the gathering", "mtg", "yu-gi-oh", "lorcana", "one piece cards", "dragon ball cards"],
    fields: [
      FIELD("game", "Game"), FIELD("set", "Set"), FIELD("card_number", "Card Number"), FIELD("character", "Character"),
      FIELD("rarity", "Rarity"), FIELD("variant", "Variant / Parallel"), FIELD("finish", "Finish", "text", { hint: "Foil, holo, reverse holo…" }),
      FIELD("language", "Language"), FIELD("edition", "Edition"), FIELD("grading_company", "Grading Company"),
      FIELD("grade", "Grade"), FIELD("certification_number", "Certification Number")
    ]
  },
  {
    id: "funko-pops",
    label: "Funko Pops & Vinyl Figures",
    aliases: ["funko", "funko pop", "pops", "pop vinyl", "vinyl figures"],
    fields: [
      FIELD("franchise", "Franchise"), FIELD("character", "Character"), FIELD("figure_number", "Figure Number"), FIELD("line", "Product Line"),
      FIELD("exclusive_to", "Exclusive To"), FIELD("variant", "Variant"), FIELD("chase", "Chase", "boolean"), FIELD("flocked", "Flocked", "boolean"),
      FIELD("box_condition", "Box Condition"), FIELD("sticker", "Sticker / Exclusive Sticker"), FIELD("grading_company", "Grading Company"),
      FIELD("grade", "Grade"), FIELD("certification_number", "Certification Number")
    ]
  },
  {
    id: "diecast-hot-wheels",
    label: "Hot Wheels & Die-Cast",
    aliases: ["hot wheels", "diecast", "die-cast", "matchbox", "greenlight", "m2 machines", "johnny lightning"],
    fields: [
      FIELD("brand", "Brand"), FIELD("vehicle", "Vehicle / Model"), FIELD("series", "Series"), FIELD("release_year", "Release Year", "number"),
      FIELD("scale", "Scale"), FIELD("colorway", "Colorway"), FIELD("casting", "Casting"), FIELD("collector_number", "Collector Number"),
      FIELD("treasure_hunt", "Treasure Hunt Type"), FIELD("exclusive_to", "Exclusive To"), FIELD("packaging_condition", "Packaging Condition")
    ]
  },
  {
    id: "comics",
    label: "Comic Books",
    aliases: ["comics", "comic", "comic books", "graphic novels"],
    fields: [
      FIELD("series_title", "Series Title"), FIELD("issue_number", "Issue Number"), FIELD("volume", "Volume"), FIELD("publisher", "Publisher"),
      FIELD("writer", "Writer"), FIELD("artist", "Artist"), FIELD("cover_artist", "Cover Artist"), FIELD("character", "Key Character"),
      FIELD("variant", "Cover / Variant"), FIELD("key_issue", "Key Issue", "boolean"), FIELD("signed_by", "Signed By"),
      FIELD("grading_company", "Grading Company"), FIELD("grade", "Grade"), FIELD("certification_number", "Certification Number")
    ]
  },
  {
    id: "action-figures",
    label: "Action Figures",
    aliases: ["action figure", "action figures", "figures", "toy figures"],
    fields: [
      FIELD("franchise", "Franchise"), FIELD("character", "Character"), FIELD("line", "Product Line"), FIELD("manufacturer", "Manufacturer"),
      FIELD("scale", "Scale"), FIELD("variant", "Variant"), FIELD("exclusive_to", "Exclusive To"), FIELD("sealed", "Sealed", "boolean"),
      FIELD("packaging_condition", "Packaging Condition"), FIELD("accessories_complete", "Accessories Complete", "boolean")
    ]
  },
  {
    id: "stamps",
    label: "Stamps & Postal Collectibles",
    aliases: ["stamp", "stamps", "postal", "postage stamps", "philately"],
    fields: [
      FIELD("country", "Country / Issuer"), FIELD("catalog_number", "Catalog Number"), FIELD("issue_date", "Issue Date", "date"), FIELD("denomination", "Denomination"),
      FIELD("currency", "Currency"), FIELD("printing_method", "Printing Method"), FIELD("perforation", "Perforation"), FIELD("watermark", "Watermark"),
      FIELD("gum_condition", "Gum Condition"), FIELD("cancellation", "Cancellation / Postmark"), FIELD("motif", "Motif / Theme")
    ]
  },
  {
    id: "coins-currency",
    label: "Coins, Currency & Legal Tender",
    aliases: ["coins", "coin", "currency", "legal tender", "paper money", "banknotes", "notes", "numismatics"],
    fields: [
      FIELD("country", "Country / Issuer"), FIELD("denomination", "Denomination"), FIELD("currency", "Currency"), FIELD("mint", "Mint"),
      FIELD("mint_mark", "Mint Mark"), FIELD("variety", "Variety"), FIELD("composition", "Composition"), FIELD("weight", "Weight"),
      FIELD("grade", "Grade"), FIELD("grading_company", "Grading Company"), FIELD("certification_number", "Certification Number"),
      FIELD("population", "Recorded Population"), FIELD("mintage", "Mintage")
    ]
  },
  {
    id: "film-memorabilia",
    label: "Film & Movie Memorabilia",
    aliases: ["movie memorabilia", "film memorabilia", "cinema memorabilia", "movie props", "screen used", "production used"],
    fields: [
      FIELD("film_title", "Film / Production"), FIELD("performer", "Performer"), FIELD("character", "Character"), FIELD("production_year", "Production Year", "number"),
      FIELD("item_role", "Item Role", "text", { hint: "Prop, costume, poster, script, production material…" }), FIELD("screen_used", "Screen Used", "boolean"),
      FIELD("production_used", "Production Used", "boolean"), FIELD("scene_reference", "Scene / Episode Reference"), FIELD("studio", "Studio / Production Company"),
      FIELD("authenticator", "Authenticator"), FIELD("certification_number", "Certification / LOA Number"), FIELD("provenance_reference", "Provenance Reference")
    ]
  },
  {
    id: "sports-memorabilia",
    label: "Sports Memorabilia",
    aliases: ["sports memorabilia", "jerseys", "game used", "game worn", "sports equipment", "tickets"],
    fields: [
      FIELD("sport", "Sport"), FIELD("athlete", "Athlete"), FIELD("team", "Team"), FIELD("season", "Season / Year"),
      FIELD("event", "Event / Game"), FIELD("item_role", "Item Type"), FIELD("game_used", "Game Used", "boolean"), FIELD("game_worn", "Game Worn", "boolean"),
      FIELD("photo_matched", "Photo Matched", "boolean"), FIELD("authenticator", "Authenticator"), FIELD("certification_number", "Certification Number"),
      FIELD("provenance_reference", "Provenance Reference")
    ]
  },
  {
    id: "autographed-items",
    label: "Autographed & Signed Items",
    aliases: ["autographs", "autographed", "signed items", "signed memorabilia", "signature"],
    fields: [
      FIELD("signed_by", "Signed By"), FIELD("signature_count", "Signature Count", "number"), FIELD("signed_on", "Signing Date", "date"),
      FIELD("signed_at", "Signing Location / Event"), FIELD("inscription", "Inscription"), FIELD("in_person", "Signed In Person", "boolean"),
      FIELD("authenticator", "Authenticator"), FIELD("certification_number", "Certification Number"), FIELD("loa_reference", "Letter of Authenticity Reference"),
      FIELD("witnessed", "Witnessed Authentication", "boolean")
    ]
  },
  {
    id: "music-memorabilia",
    label: "Music Memorabilia",
    aliases: ["music memorabilia", "concert memorabilia", "band memorabilia", "artist memorabilia", "music collectibles"],
    fields: [
      FIELD("artist", "Artist / Band"), FIELD("tour", "Tour"), FIELD("event", "Concert / Event"), FIELD("venue", "Venue"),
      FIELD("event_date", "Event Date", "date"), FIELD("item_role", "Item Type", "text", { hint: "Poster, pass, instrument, clothing, setlist…" }),
      FIELD("signed_by", "Signed By"), FIELD("authenticator", "Authenticator"), FIELD("certification_number", "Certification Number"),
      FIELD("provenance_reference", "Provenance Reference")
    ]
  },
  {
    id: "video-games",
    label: "Video Games & Consoles",
    aliases: ["video games", "games", "consoles", "retro games", "sealed games"],
    fields: [
      FIELD("platform", "Platform"), FIELD("publisher", "Publisher"), FIELD("developer", "Developer"), FIELD("region", "Region"),
      FIELD("edition", "Edition"), FIELD("variant", "Variant"), FIELD("complete_in_box", "Complete in Box", "boolean"), FIELD("sealed", "Sealed", "boolean"),
      FIELD("grading_company", "Grading Company"), FIELD("grade", "Grade"), FIELD("certification_number", "Certification Number")
    ]
  },
  {
    id: "records-music-media",
    label: "Records & Music Media",
    aliases: ["vinyl", "records", "record collection", "cds", "cassette", "music media"],
    fields: [
      FIELD("artist", "Artist"), FIELD("release_title", "Release Title"), FIELD("label", "Label"), FIELD("catalog_number", "Catalog Number"),
      FIELD("format", "Format"), FIELD("pressing", "Pressing / Edition"), FIELD("country", "Country"), FIELD("media_condition", "Media Condition"),
      FIELD("sleeve_condition", "Sleeve / Packaging Condition"), FIELD("signed_by", "Signed By")
    ]
  },
  {
    id: "historical-memorabilia",
    label: "Historical Memorabilia",
    aliases: ["historical memorabilia", "historical artifacts", "political memorabilia", "militaria"],
    fields: [
      FIELD("era", "Era / Period"), FIELD("person", "Associated Person"), FIELD("event", "Associated Event"), FIELD("origin", "Origin"),
      FIELD("material", "Material"), FIELD("authenticator", "Authenticator"), FIELD("certification_number", "Certification Number"),
      FIELD("provenance_reference", "Provenance Reference")
    ]
  },
  {
    id: "building-sets",
    label: "LEGO & Building Sets",
    aliases: ["lego", "building sets", "brick sets", "construction toys"],
    fields: [
      FIELD("theme", "Theme"), FIELD("set_number", "Set Number"), FIELD("set_name", "Set Name"), FIELD("piece_count", "Piece Count", "number"),
      FIELD("minifigures_complete", "Minifigures Complete", "boolean"), FIELD("instructions_present", "Instructions Present", "boolean"),
      FIELD("box_present", "Box Present", "boolean"), FIELD("sealed", "Sealed", "boolean")
    ]
  },
  {
    id: "tickets-event",
    label: "Tickets & Event Memorabilia",
    aliases: ["tickets", "ticket stubs", "event memorabilia", "concert tickets", "sports tickets"],
    fields: [
      FIELD("event", "Event"), FIELD("venue", "Venue"), FIELD("event_date", "Event Date", "date"), FIELD("seat", "Seat / Section"),
      FIELD("participant", "Performer / Team / Participant"), FIELD("ticket_type", "Ticket Type"), FIELD("grading_company", "Grading Company"),
      FIELD("grade", "Grade"), FIELD("certification_number", "Certification Number")
    ]
  },
  {
    id: "other",
    label: "Other / Custom Collectible",
    aliases: ["other", "custom", "miscellaneous", "collectible"],
    fields: [FIELD("subject", "Subject / Theme"), FIELD("creator", "Creator / Maker"), FIELD("identifier", "Catalog / Identifier"), FIELD("provenance_reference", "Provenance Reference")]
  }
].map((profile) => Object.freeze({ ...profile, aliases: Object.freeze(profile.aliases), fields: Object.freeze(profile.fields) }));

export const VAULT_CATEGORY_PROFILES = Object.freeze(PROFILES);

function normalize(value) {
  return String(value ?? "").normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const LOOKUP = new Map();
for (const profile of VAULT_CATEGORY_PROFILES) {
  LOOKUP.set(normalize(profile.label), profile);
  LOOKUP.set(normalize(profile.id), profile);
  for (const alias of profile.aliases) LOOKUP.set(normalize(alias), profile);
}

export function matchVaultCategory(value) {
  const normalized = normalize(value);
  if (!normalized) return null;
  if (LOOKUP.has(normalized)) return LOOKUP.get(normalized);
  for (const [alias, profile] of LOOKUP) {
    if (normalized.includes(alias) || alias.includes(normalized)) return profile;
  }
  return null;
}

export function listVaultCategoryProfiles() {
  return VAULT_CATEGORY_PROFILES.map((profile) => ({
    id: profile.id,
    label: profile.label,
    aliases: [...profile.aliases],
    fields: profile.fields.map((field) => ({ ...field }))
  }));
}
