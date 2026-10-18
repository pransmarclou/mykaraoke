import assert from "node:assert/strict";
import test from "node:test";
import {
  buildJoinUrl,
  credentialDigest,
  isValidRoomCode,
  makeRoomCode,
  newHostCredential,
  normalizeRoomCode,
  roomExpiresAt,
  ROOM_LIFETIME_MS,
} from "../../src/lib/rooms/room-code";

test("codes are six unambiguous characters and accept human spacing", () => {
  assert.equal(normalizeRoomCode(" ab-c 234 "), "ABC234");
  assert.equal(isValidRoomCode("ab-c 234"), true);
  assert.equal(isValidRoomCode("ABCO10"), false);
  for (let index = 0; index < 100; index += 1) {
    assert.equal(isValidRoomCode(makeRoomCode()), true);
  }
});

test("room lifetime is exactly 24 hours", () => {
  const createdAt = new Date("2026-10-17T12:00:00.000Z");
  assert.equal(roomExpiresAt(createdAt).getTime() - createdAt.getTime(), ROOM_LIFETIME_MS);
});

test("invite URLs use one canonical origin and the normalized code", () => {
  assert.equal(buildJoinUrl("http://127.0.0.1:3100", "ab-c 234"), "http://127.0.0.1:3100/join?code=ABC234");
  assert.throws(() => buildJoinUrl("http://example.com", "ABC234"));
  assert.throws(() => buildJoinUrl("https://example.com/path", "ABC234"));
  assert.throws(() => buildJoinUrl("https://example.com", "BAD10O"));
});

test("host credentials are random, valid, and reduced to a nonreversible digest", () => {
  const first = newHostCredential();
  const second = newHostCredential();
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  const digest = credentialDigest(first);
  assert.equal(digest?.length, 32);
  assert.notEqual(digest?.toString("hex"), first);
  assert.equal(credentialDigest("not-a-token"), null);
});
