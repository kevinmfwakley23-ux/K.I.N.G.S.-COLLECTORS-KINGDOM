import test from "node:test";
import assert from "node:assert/strict";
import { insertVoiceTranscript, parseKingdomVoiceCommand } from "../apps/web/public/voice.js";

test("Kingdom voice grammar handles navigation, Keeper, search, and Vault intake commands", () => {
  assert.deepEqual(parseKingdomVoiceCommand("Open the Royal Vault"), {
    action: "navigate",
    transcript: "Open the Royal Vault",
    destination: "royal vault",
    href: "/vault.html"
  });

  assert.deepEqual(parseKingdomVoiceCommand("Take me to the street market"), {
    action: "navigate",
    transcript: "Take me to the street market",
    destination: "street market",
    href: "/room.html?room=marketplace"
  });

  assert.equal(parseKingdomVoiceCommand("Call the Keeper").action, "keeper-open");
  assert.equal(parseKingdomVoiceCommand("Close Keeper").action, "keeper-close");

  const keeperQuestion = parseKingdomVoiceCommand("Ask the Keeper what should I catalog next?");
  assert.equal(keeperQuestion.action, "keeper-message");
  assert.equal(keeperQuestion.content, "what should I catalog next?");

  const search = parseKingdomVoiceCommand("Search the Vault for Pokémon Charizard");
  assert.equal(search.action, "search");
  assert.equal(search.query, "Pokémon Charizard");

  assert.equal(parseKingdomVoiceCommand("Add a treasure").action, "add-treasure");
});

test("Kingdom voice grammar does not execute destructive record mutations", () => {
  for (const phrase of [
    "archive this treasure",
    "delete this treasure",
    "remove this treasure",
    "sell this treasure",
    "buy this item",
    "transfer ownership"
  ]) {
    assert.equal(parseKingdomVoiceCommand(phrase).action, "unrecognized", phrase);
  }
});

test("voice dictation inserts text at the selected caret without replacing unrelated content", () => {
  const events = [];
  const target = {
    value: "Charizard notes",
    selectionStart: 9,
    selectionEnd: 9,
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
    dispatchEvent(event) {
      events.push(event.type);
    }
  };

  const result = insertVoiceTranscript(target, "first edition");
  assert.equal(result, "Charizard first edition notes");
  assert.equal(target.value, "Charizard first edition notes");
  assert.deepEqual(events, ["input"]);
});
