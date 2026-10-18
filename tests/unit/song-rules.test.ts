import assert from "node:assert/strict";
import { test } from "node:test";
import { movedIds, QueueError } from "../../src/lib/songs/queue";
import { durationSeconds, mapYouTubeResults, normalizeSongQuery, SongSearchError } from "../../src/lib/songs/youtube";
import { youtubeThumbnailUrl } from "../../src/lib/songs/thumbnail";

test("search query is normalized and bounded", () => {
  assert.equal(normalizeSongQuery("  Dancing   Queen  "), "Dancing Queen");
  assert.throws(() => normalizeSongQuery("x"), (error: unknown) => error instanceof SongSearchError && error.reason === "invalid");
  assert.throws(() => normalizeSongQuery("abc\u0000xyz"), SongSearchError);
});

test("YouTube mapping accepts only public embeddable supported videos", () => {
  const search = { items: [
    { id: { videoId: "aBcDeFgHi01" }, snippet: { title: "Song &amp; Artist", channelTitle: "Karaoke channel" } },
    { id: { videoId: "aBcDeFgHi02" }, snippet: { title: "Blocked", channelTitle: "Karaoke channel" } },
  ] };
  const videos = { items: [
    { id: "aBcDeFgHi01", status: { embeddable: true, privacyStatus: "public" }, contentDetails: { duration: "PT3M9S" } },
    { id: "aBcDeFgHi02", status: { embeddable: false, privacyStatus: "public" }, contentDetails: { duration: "PT2M" } },
  ] };
  assert.deepEqual(mapYouTubeResults(search, videos), [{ youtubeId: "aBcDeFgHi01", title: "Song & Artist", channelTitle: "Karaoke channel", durationSeconds: 189 }]);
  assert.equal(durationSeconds("P1D"), null);
  assert.equal(durationSeconds("PT1M"), 60);
});

test("thumbnail URL accepts only a YouTube video ID", () => {
  assert.equal(youtubeThumbnailUrl("aBcDeFgHi01"), "https://i.ytimg.com/vi/aBcDeFgHi01/mqdefault.jpg");
  assert.equal(youtubeThumbnailUrl("../not-a-video"), null);
});

test("queue move derives a new order without mutating input", () => {
  const ids = ["a", "b", "c"];
  assert.deepEqual(movedIds(ids, "b", "down"), ["a", "c", "b"]);
  assert.deepEqual(ids, ["a", "b", "c"]);
  assert.throws(() => movedIds(ids, "a", "up"), (error: unknown) => error instanceof QueueError && error.reason === "missing");
});
