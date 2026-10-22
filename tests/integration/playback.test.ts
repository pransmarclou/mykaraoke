import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { getDb } from "../../src/lib/db";
import { RemoteMicError, sendRemoteMicSignal } from "../../src/lib/microphone/remote-state";
import { joinRoom } from "../../src/lib/rooms/guests";
import { createHostRoom } from "../../src/lib/rooms/repository";
import { addQueueItem, queueSnapshot } from "../../src/lib/songs/queue";
import { hostPlaybackCommand, issueTvPairCode, pairTv, playbackSnapshot, PlaybackError, provisionTv, tvPlayerEvent, tvRoomAccess } from "../../src/lib/playback/state";

const rooms: string[] = [];
const songs: string[] = [];
after(async () => {
  if (rooms.length) await getDb().query("delete from public.rooms where id = any($1::uuid[])", [rooms]);
  if (songs.length) await getDb().query("delete from public.song_search_results where id = any($1::uuid[])", [songs]);
  await getDb().end();
});
async function fixtureSong(videoId: string) {
  const result = await getDb().query<{ id: string }>(
    `insert into public.song_search_results (query, youtube_id, title, channel_title, duration_seconds, generation)
     values ($1,$2,$3,'Fixture channel',180,$4) returning id`, [`fixture ${randomUUID()}`, videoId, `Song ${videoId}`, randomUUID()]);
  songs.push(result.rows[0].id);
  return result.rows[0].id;
}

test("TV pairing uses a short-lived code and rotates device authority", async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  assert.equal(await tvRoomAccess(host.room.code, host.room.code), null);
  const firstCode = await issueTvPairCode(host.room.id);
  await assert.rejects(pairTv(host.room.code, "ABCDEFGH"), (error: unknown) => error instanceof PlaybackError && error.reason === "pair_invalid");
  const first = await pairTv(host.room.code, firstCode);
  assert.equal(await tvRoomAccess(host.room.code, first.credential), host.room.id);
  await assert.rejects(pairTv(host.room.code, firstCode), PlaybackError);
  const second = await pairTv(host.room.code, await issueTvPairCode(host.room.id));
  assert.equal(await tvRoomAccess(host.room.code, first.credential), null);
  assert.equal(await tvRoomAccess(host.room.code, second.credential), host.room.id);
});

test("a host launch directly provisions its current browser as the TV", async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  const tv = await provisionTv(host.room.id);
  assert.equal(tv.autoStarted, false);
  assert.equal(await tvRoomAccess(host.room.code, tv.credential), host.room.id);
  assert.equal((await playbackSnapshot(host.room.id)).devicePaired, true);
  const searchResultId = await fixtureSong("fBcDeFgHi08");
  const added = await addQueueItem({ roomId: host.room.id, role: "host", searchResultId, singerName: "Host", requestKey: randomUUID() });
  assert.equal(added.autoStarted, true);
  assert.equal(added.items.length, 0);
  assert.equal((await playbackSnapshot(host.room.id)).current?.youtubeId, "fBcDeFgHi08");
});

test("pairing a display auto-cues an already saved room queue", async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  const searchResultId = await fixtureSong("fBcDeFgHi09");
  await addQueueItem({ roomId: host.room.id, role: "host", searchResultId, singerName: "Host", requestKey: randomUUID() });

  const paired = await pairTv(host.room.code, await issueTvPairCode(host.room.id));
  assert.equal(paired.autoStarted, true);
  const started = await playbackSnapshot(host.room.id);
  assert.equal(started.current?.youtubeId, "fBcDeFgHi09");
  assert.equal(started.desired, "play");
  assert.equal(started.observed, "cued");
  assert.equal(started.queuedCount, 0);
});

test("queue auto-start, host commands, TV events, and advancement are atomic and idempotent", async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  await assert.rejects(hostPlaybackCommand(host.room.id, "start", randomUUID()), (error: unknown) => error instanceof PlaybackError && error.reason === "no_device");
  const paired = await pairTv(host.room.code, await issueTvPairCode(host.room.id));
  const firstSong = await fixtureSong("fBcDeFgHi01");
  const secondSong = await fixtureSong("fBcDeFgHi02");
  const first = await addQueueItem({ roomId: host.room.id, role: "host", searchResultId: firstSong, singerName: "Host", requestKey: randomUUID() });
  const second = await addQueueItem({ roomId: host.room.id, role: "host", searchResultId: secondSong, singerName: "Host", requestKey: randomUUID() });
  assert.equal(first.autoStarted, true);
  assert.equal(second.autoStarted, false);
  const started = await playbackSnapshot(host.room.id);
  assert.equal(started.current?.youtubeId, "fBcDeFgHi01");
  assert.equal(started.observed, "cued");
  assert.equal(started.next?.youtubeId, "fBcDeFgHi02");
  assert.deepEqual(started.upNext.map((item) => item.youtubeId), ["fBcDeFgHi02"]);
  assert.equal(started.queuedCount, 1);
  assert.equal((await queueSnapshot(host.room.id)).items.length, 1);
  const blocked = await tvPlayerEvent(host.room.id, paired.credential, started.current!.id, "blocked");
  assert.equal(blocked.observed, "blocked");
  assert.equal(blocked.desired, "play");
  const playing = await tvPlayerEvent(host.room.id, paired.credential, started.current!.id, "playing");
  assert.equal(playing.observed, "playing");
  const key = randomUUID();
  const paused = await hostPlaybackCommand(host.room.id, "pause", key);
  assert.equal(paused.desired, "pause");
  assert.equal(paused.observed, "playing");
  assert.equal((await hostPlaybackCommand(host.room.id, "pause", key)).version, paused.version);
  await assert.rejects(hostPlaybackCommand(host.room.id, "skip", key), (error: unknown) => error instanceof PlaybackError && error.reason === "invalid");
  assert.equal((await tvPlayerEvent(host.room.id, paired.credential, started.current!.id, "paused")).observed, "paused");
  await hostPlaybackCommand(host.room.id, "resume", randomUUID());
  const advanced = await tvPlayerEvent(host.room.id, paired.credential, started.current!.id, "ended");
  assert.equal(advanced.current?.youtubeId, "fBcDeFgHi02");
  assert.equal(advanced.observed, "cued");
  assert.equal((await tvPlayerEvent(host.room.id, paired.credential, started.current!.id, "ended")).current?.id, advanced.current?.id);
  await assert.rejects(tvPlayerEvent(host.room.id, "0".repeat(64), advanced.current!.id, "ended"), (error: unknown) => error instanceof PlaybackError && error.reason === "forbidden");
  const ended = await hostPlaybackCommand(host.room.id, "skip", randomUUID());
  assert.equal(ended.current, null);
  assert.equal(ended.observed, "idle");
  assert.equal((await playbackSnapshot(host.room.id)).next, null);
  assert.equal((await playbackSnapshot(host.room.id)).queuedCount, 0);
});

test("public database roles cannot access playback state or pairing data", async () => {
  for (const role of ["anon", "authenticated"]) {
    for (const table of ["playback_state", "playback_commands", "playback_pair_limits"]) {
      const client = await getDb().connect();
      try {
        await client.query("begin");
        await client.query(`set local role ${role}`);
        await assert.rejects(client.query(`select * from public.${table} limit 1`), (error: unknown) => (error as { code?: string }).code === "42501");
      } finally { await client.query("rollback"); client.release(); }
    }
  }
});

test("only the guest who requested the current song can signal a phone microphone", async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  const owner = await joinRoom(host.room.code, "Singer", undefined);
  const other = await joinRoom(host.room.code, "Other guest", undefined);
  const searchResultId = await fixtureSong("fBcDeFgHi03");
  await addQueueItem({ roomId: host.room.id, role: "guest", guestId: owner.guest.id, searchResultId, singerName: owner.guest.label, requestKey: randomUUID() });
  await pairTv(host.room.code, await issueTvPairCode(host.room.id));
  const started = await playbackSnapshot(host.room.id);
  assert.equal(started.current?.requestedBy, owner.guest.id);
  const itemId = started.current!.id;
  const sessionId = randomUUID();
  const offer = { kind: "offer" as const, itemId, sessionId, description: { type: "offer" as const, sdp: "v=0" } };
  const sent = await sendRemoteMicSignal({ roomId: host.room.id, role: "guest", guestId: owner.guest.id, signal: offer });
  assert.equal(sent.from, "guest");
  assert.equal(sent.guestId, owner.guest.id);
  await assert.rejects(
    sendRemoteMicSignal({ roomId: host.room.id, role: "guest", guestId: other.guest.id, signal: offer }),
    (error: unknown) => error instanceof RemoteMicError && error.reason === "forbidden",
  );
  const muted = await sendRemoteMicSignal({ roomId: host.room.id, role: "host", signal: { kind: "host-mute", itemId, sessionId, guestId: owner.guest.id, muted: true } });
  assert.equal(muted.from, "host");
  assert.equal(muted.kind, "host-mute");
  await assert.rejects(
    sendRemoteMicSignal({ roomId: host.room.id, role: "host", signal: { kind: "host-mute", itemId, sessionId, guestId: other.guest.id, muted: false } }),
    (error: unknown) => error instanceof RemoteMicError && error.reason === "forbidden",
  );
});
