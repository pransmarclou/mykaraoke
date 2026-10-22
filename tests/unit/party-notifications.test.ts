import assert from "node:assert/strict";
import test from "node:test";
import { parsePartyNotification, partyNotificationMessage } from "../../src/lib/rooms/notification-rules";

const joined = {
  id: "10000000-0000-4000-8000-000000000001",
  kind: "member_joined" as const,
  actorId: "20000000-0000-4000-8000-000000000002",
  actorName: "Alex",
  occurredAt: "2026-10-22T12:00:00.000Z",
};

test("party notifications accept bounded joined and song events", () => {
  assert.deepEqual(parsePartyNotification(joined), joined);
  const song = {
    id: "30000000-0000-4000-8000-000000000003",
    kind: "song_added" as const,
    actorId: joined.actorId,
    actorName: "Alex",
    songTitle: "Buwan Karaoke",
    autoStarted: false,
    occurredAt: joined.occurredAt,
  };
  assert.deepEqual(parsePartyNotification(song), song);
  assert.equal(parsePartyNotification({ ...song, songTitle: "" }), null);
  assert.equal(parsePartyNotification({ ...joined, actorId: "not-a-member" }), null);
  assert.equal(parsePartyNotification({ ...joined, kind: "unknown" }), null);
});

test("party notification copy distinguishes queued and immediately started songs", () => {
  assert.equal(partyNotificationMessage(joined), "Alex joined the room.");
  const song = {
    id: "30000000-0000-4000-8000-000000000003",
    kind: "song_added" as const,
    actorId: joined.actorId,
    actorName: "Alex",
    songTitle: "Buwan Karaoke",
    autoStarted: false,
    occurredAt: joined.occurredAt,
  };
  assert.equal(partyNotificationMessage(song), "Alex added Buwan Karaoke to the queue.");
  assert.equal(partyNotificationMessage({ ...song, autoStarted: true }), "Alex added Buwan Karaoke. It is starting now.");
});
