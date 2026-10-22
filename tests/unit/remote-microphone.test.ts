import assert from "node:assert/strict";
import test from "node:test";
import { guestOwnsCurrentMicrophone, parseRemoteMicSignalEvent, parseRemoteMicSignalRequest } from "../../src/lib/microphone/remote-rules";
import { remoteMicTopic } from "../../src/lib/microphone/remote-topic";

const itemId = "10000000-0000-4000-8000-000000000001";
const sessionId = "20000000-0000-4000-8000-000000000002";
const guestId = "30000000-0000-4000-8000-000000000003";

test("remote microphone requests accept bounded WebRTC messages", () => {
  const offer = { kind: "offer", itemId, sessionId, description: { type: "offer", sdp: "v=0" } };
  assert.deepEqual(parseRemoteMicSignalRequest(offer), offer);
  assert.equal(parseRemoteMicSignalRequest({ ...offer, itemId: "not-a-uuid" }), null);
  assert.equal(parseRemoteMicSignalRequest({ ...offer, description: { type: "answer", sdp: "v=0" } }), null);
  assert.equal(parseRemoteMicSignalRequest({ ...offer, description: { type: "offer", sdp: "x".repeat(65_536) } }), null);

  const candidate = { kind: "candidate", itemId, sessionId, candidate: { candidate: "candidate:1", sdpMid: "0", sdpMLineIndex: 0, usernameFragment: null } };
  assert.deepEqual(parseRemoteMicSignalRequest(candidate), candidate);
  assert.equal(parseRemoteMicSignalRequest({ ...candidate, candidate: { ...candidate.candidate, sdpMLineIndex: -1 } }), null);
});

test("remote microphone events require authenticated server metadata", () => {
  const event = { id: "40000000-0000-4000-8000-000000000004", kind: "host-mute", itemId, sessionId, guestId, muted: true, from: "host", sentAt: "2026-10-21T12:00:00.000Z" };
  assert.deepEqual(parseRemoteMicSignalEvent(event), event);
  assert.equal(parseRemoteMicSignalEvent({ ...event, from: "tv" }), null);
  assert.equal(parseRemoteMicSignalEvent({ ...event, sentAt: "not-a-date" }), null);
});

test("only the queue requester owns the current guest microphone", () => {
  assert.equal(guestOwnsCurrentMicrophone(guestId, guestId), true);
  assert.equal(guestOwnsCurrentMicrophone(guestId, "50000000-0000-4000-8000-000000000005"), false);
  assert.equal(guestOwnsCurrentMicrophone(null, guestId), false);
});

test("microphone signaling uses a server-secret current-song capability", () => {
  const queueTopic = "60000000-0000-4000-8000-000000000006";
  const secret = "a-production-length-secret-value-123456";
  const topic = remoteMicTopic(secret, queueTopic, itemId, guestId);
  assert.match(topic ?? "", new RegExp(`^mic:${queueTopic}:[0-9a-f]{64}$`, "u"));
  assert.notEqual(topic, remoteMicTopic(secret, queueTopic, "70000000-0000-4000-8000-000000000007", guestId));
  assert.equal(remoteMicTopic("too-short", queueTopic, itemId, guestId), null);
});
