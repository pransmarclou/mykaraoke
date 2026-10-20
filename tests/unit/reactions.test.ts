import assert from "node:assert/strict";
import test from "node:test";
import { isRoomReactionId, parseRoomReactionEvent, reactionEmoji } from "../../src/lib/reactions/rules";

test("only the fixed reaction set is accepted", () => {
  assert.equal(isRoomReactionId("applause"), true);
  assert.equal(isRoomReactionId("party"), true);
  assert.equal(isRoomReactionId("custom"), false);
  assert.equal(isRoomReactionId({ id: "fire" }), false);
});
test("TV reaction events require bounded, typed fields", () => {
  const valid = { id: "event-1", reaction: "heart", sender: "Alex", sentAt: "2026-10-20T12:00:00.000Z" };
  assert.deepEqual(parseRoomReactionEvent(valid), valid);
  assert.equal(parseRoomReactionEvent({ ...valid, reaction: "script" }), null);
  assert.equal(parseRoomReactionEvent({ ...valid, sender: "" }), null);
  assert.equal(parseRoomReactionEvent({ ...valid, sentAt: "not-a-date" }), null);
  assert.equal(parseRoomReactionEvent(null), null);
});

test("reaction IDs resolve to their approved emoji", () => {
  assert.equal(reactionEmoji("applause"), "👏");
  assert.equal(reactionEmoji("fire"), "🔥");
});
