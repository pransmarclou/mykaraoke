import assert from "node:assert/strict";
import test from "node:test";
import { nextTvFocusIndex, SINGER_COUNTDOWN_SECONDS } from "../../src/lib/tv/remote-rules";

test("TV focus navigation starts predictably and wraps in both directions", () => {
  assert.equal(nextTvFocusIndex(-1, 3, 1), 0);
  assert.equal(nextTvFocusIndex(-1, 3, -1), 0);
  assert.equal(nextTvFocusIndex(0, 3, -1), 2);
  assert.equal(nextTvFocusIndex(2, 3, 1), 0);
  assert.equal(nextTvFocusIndex(1, 3, 1), 2);
  assert.equal(nextTvFocusIndex(0, 0, 1), -1);
});

test("the singer-ready countdown stays short enough for a party transition", () => {
  assert.equal(SINGER_COUNTDOWN_SECONDS, 5);
});
