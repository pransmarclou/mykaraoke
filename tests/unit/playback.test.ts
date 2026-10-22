import assert from "node:assert/strict";
import test from "node:test";
import { commandReplayDecision, playerEventTransition, shouldAutoCueAfterPair, shouldAutoStartAfterQueueAdd } from "../../src/lib/playback/rules";

test("pairing auto-cues only when a waiting queue exists and no song is current", () => {
  assert.equal(shouldAutoCueAfterPair(null, 2), true);
  assert.equal(shouldAutoCueAfterPair(null, 0), false);
  assert.equal(shouldAutoCueAfterPair("current", 2), false);
});

test("a queue addition auto-starts only on an authorized idle TV", () => {
  assert.equal(shouldAutoStartAfterQueueAdd(true, null), true);
  assert.equal(shouldAutoStartAfterQueueAdd(false, null), false);
  assert.equal(shouldAutoStartAfterQueueAdd(true, "current"), false);
});

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
