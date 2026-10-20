import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_SONG_FAVORITES,
  parseSongFavorites,
  serializeSongFavorites,
  toggleSongFavorite,
  type FavoriteSong,
} from "../../src/lib/songs/favorites";

const song = (index: number): FavoriteSong => ({
  youtubeId: `videoid${String(index).padStart(4, "0")}`,
  title: `Song ${index}`,
  channelTitle: "Karaoke channel",
  durationSeconds: 180,
});

test("favorites round-trip through the versioned local schema", () => {
  const favorites = [song(1), song(2)];
  assert.deepEqual(parseSongFavorites(serializeSongFavorites(favorites)), favorites);
});

test("favorites reject malformed storage and discard invalid or duplicate items", () => {
  assert.deepEqual(parseSongFavorites("not json"), []);
  assert.deepEqual(parseSongFavorites(JSON.stringify({ version: 2, items: [song(1)] })), []);
  assert.deepEqual(parseSongFavorites(JSON.stringify({ version: 1, items: [song(1), song(1), { ...song(2), youtubeId: "../invalid" }] })), [song(1)]);
});

test("favorite toggle adds newest first, removes an existing song, and enforces the cap", () => {
  assert.deepEqual(toggleSongFavorite([], song(1)), [song(1)]);
  assert.deepEqual(toggleSongFavorite([song(1), song(2)], song(1)), [song(2)]);
  const full = Array.from({ length: MAX_SONG_FAVORITES }, (_, index) => song(index));
  const next = toggleSongFavorite(full, song(MAX_SONG_FAVORITES));
  assert.equal(next.length, MAX_SONG_FAVORITES);
  assert.equal(next[0].youtubeId, song(MAX_SONG_FAVORITES).youtubeId);
  assert.equal(next.some((item) => item.youtubeId === song(MAX_SONG_FAVORITES - 1).youtubeId), false);
});
