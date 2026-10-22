import assert from "node:assert/strict";
import test from "node:test";
import {
  nextTvFocusIndex,
  shouldShowTvSongStartNotice,
  SINGER_COUNTDOWN_SECONDS,
  TV_START_NOTICE_MS,
  tvQueuePreview,
} from "../../src/lib/tv/remote-rules";

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
  assert.equal(TV_START_NOTICE_MS, 6_000);
});

test("the TV announces only a newly observed current song", () => {
  assert.equal(shouldShowTvSongStartNotice(null, "song-one"), true);
  assert.equal(shouldShowTvSongStartNotice("song-one", "song-one"), false);
  assert.equal(shouldShowTvSongStartNotice("song-one", "song-two"), true);
  assert.equal(shouldShowTvSongStartNotice("song-one", null), false);
});

test("TV queue preview stays bounded and reports hidden songs", () => {
  const preview = tvQueuePreview(["one", "two", "three", "four"], 7, 3);
  assert.deepEqual(preview.visible, ["one", "two", "three"]);
  assert.equal(preview.hiddenCount, 4);
  assert.deepEqual(tvQueuePreview(["one"], 1, 5), { visible: ["one"], hiddenCount: 0 });
});
