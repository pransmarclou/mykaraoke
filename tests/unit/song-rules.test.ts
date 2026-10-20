import assert from "node:assert/strict";
import { test } from "node:test";
import { movedIds, QueueError } from "../../src/lib/songs/queue";
import { fairSingerOrder } from "../../src/lib/songs/rotation";
import { normalizeSingerAssignment, performerKey, singerLabel, SingerAssignmentError } from "../../src/lib/songs/singers";
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

test("fair rotation alternates singers and preserves each singer's request order", () => {
  const items = [
    { id: "alex-1", singerName: "Alex" },
    { id: "alex-2", singerName: "alex" },
    { id: "sam-1", singerName: "Sam" },
    { id: "alex-3", singerName: "Alex" },
    { id: "sam-2", singerName: "Sam" },
  ];
  assert.deepEqual(fairSingerOrder(items).map((item) => item.id), ["alex-1", "sam-1", "alex-2", "sam-2", "alex-3"]);
  assert.deepEqual(items.map((item) => item.id), ["alex-1", "alex-2", "sam-1", "alex-3", "sam-2"]);
});

test("fair rotation starts after the singer currently on stage", () => {
  const items = [
    { id: "alex-1", singerName: "Alex" },
    { id: "sam-1", singerName: "Sam" },
    { id: "lee-1", singerName: "Lee" },
    { id: "sam-2", singerName: "Sam" },
  ];
  assert.deepEqual(fairSingerOrder(items, { singerName: "Sam" }).map((item) => item.id), ["lee-1", "alex-1", "sam-1", "sam-2"]);
});

test("duet assignment normalizes two distinct singers and formats one stage label", () => {
  const duet = normalizeSingerAssignment("  Alex  ", " Sam ");
  assert.deepEqual(duet, { singerName: "Alex", duetSingerName: "Sam" });
  assert.equal(singerLabel(duet), "Alex & Sam");
  assert.equal(performerKey(duet), performerKey({ singerName: "sam", duetSingerName: "ALEX" }));
  assert.throws(
    () => normalizeSingerAssignment("Alex", "  alex "),
    (error: unknown) => error instanceof SingerAssignmentError && error.reason === "same_singer",
  );
});

test("fair rotation treats a duet pair as one performer unit", () => {
  const items = [
    { id: "duet-1", singerName: "Alex", duetSingerName: "Sam" },
    { id: "duet-2", singerName: "Sam", duetSingerName: "Alex" },
    { id: "lee-1", singerName: "Lee", duetSingerName: null },
  ];
  assert.deepEqual(fairSingerOrder(items).map((item) => item.id), ["duet-1", "lee-1", "duet-2"]);
});
