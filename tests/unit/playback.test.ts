import assert from "node:assert/strict";
import test from "node:test";
import { commandReplayDecision, playerEventTransition } from "../../src/lib/playback/rules";

test("host command keys replay only the same action", () => {
  assert.equal(commandReplayDecision(undefined, "start"), "execute");
  assert.equal(commandReplayDecision("start", "start"), "replay");
  assert.equal(commandReplayDecision("start", "skip"), "reject");
});

test("player events from a previous song cannot change the current song", () => {
  assert.equal(playerEventTransition("current", "old", "playing", "ended", null), "ignore");
  assert.equal(playerEventTransition(null, "old", "idle", "playing", null), "ignore");
});

test("ended advances once while repeated state events are ignored", () => {
  assert.equal(playerEventTransition("current", "current", "playing", "ended", null), "advance");
  assert.equal(playerEventTransition("current", "current", "playing", "playing", null), "ignore");
  assert.equal(playerEventTransition("current", "current", "cued", "playing", null), "update");
});

test("a new player error code updates the displayed failure", () => {
  assert.equal(playerEventTransition("current", "current", "error", "error", 150, 150), "ignore");
  assert.equal(playerEventTransition("current", "current", "error", "error", 150, 101), "update");
});
