import assert from "node:assert/strict";
import test from "node:test";
import { averageStars, buildLeaderboard, isStarRating } from "../../src/lib/scores/rules";

test("only whole 1–5 star ratings are accepted", () => {
  for (const value of [1, 2, 3, 4, 5]) assert.equal(isStarRating(value), true);
  for (const value of [0, 6, 3.5, -1, "4", null, undefined, Number.NaN]) assert.equal(isStarRating(value), false);
});

test("averages round to one decimal and handle no ratings", () => {
  assert.equal(averageStars(0, 0), 0);
  assert.equal(averageStars(14, 3), 4.7);
  assert.equal(averageStars(9, 2), 4.5);
});

test("leaderboard groups by performer, treats a duet pair as one performer, and ranks by average then volume", () => {
  const board = buildLeaderboard([
    { itemId: "a1", singerName: "Alex", duetSingerName: null, stars: 5 },
    { itemId: "a1", singerName: "Alex", duetSingerName: null, stars: 3 },
    { itemId: "a2", singerName: " alex ", duetSingerName: null, stars: 4 },
    { itemId: "s1", singerName: "Sam", duetSingerName: null, stars: 4 },
    { itemId: "d1", singerName: "Sam", duetSingerName: "Kai", stars: 5 },
    { itemId: "d2", singerName: "Kai", duetSingerName: "Sam", stars: 5 },
    { itemId: "b1", singerName: "Bo", duetSingerName: null, stars: 4 },
    { itemId: "b1", singerName: "Bo", duetSingerName: null, stars: 4 },
  ]);
  assert.deepEqual(board, [
    { performer: "Sam & Kai", average: 5, ratings: 2, songs: 2 },
    { performer: "Alex", average: 4, ratings: 3, songs: 2 },
    { performer: "Bo", average: 4, ratings: 2, songs: 1 },
    { performer: "Sam", average: 4, ratings: 1, songs: 1 },
  ]);
});

test("leaderboard is capped", () => {
  const rows = Array.from({ length: 15 }, (_, index) => ({ itemId: `i${index}`, singerName: `Singer ${index}`, duetSingerName: null, stars: 3 }));
  assert.equal(buildLeaderboard(rows).length, 10);
  assert.equal(buildLeaderboard(rows, 3).length, 3);
});
