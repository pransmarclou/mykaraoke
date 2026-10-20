import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { getDb } from "../../src/lib/db";
import { readGuestPermissions, updateGuestPermissions } from "../../src/lib/permissions/state";
import { hostPlaybackCommand, PlaybackError } from "../../src/lib/playback/state";
import { ReactionError, sendRoomReaction } from "../../src/lib/reactions/state";
import { createHostRoom } from "../../src/lib/rooms/repository";
import { joinRoom } from "../../src/lib/rooms/guests";
import { addQueueItem, mutateQueue, queueSnapshot, QueueError } from "../../src/lib/songs/queue";

const rooms: string[] = [];
const songs: string[] = [];
after(async () => {
  if (rooms.length) await getDb().query("delete from public.rooms where id = any($1::uuid[])", [rooms]);
  if (songs.length) await getDb().query("delete from public.song_search_results where id = any($1::uuid[])", [songs]);
  await getDb().end();
});

async function seedSong(youtubeId: string) {
  const row = await getDb().query<{ id: string }>(
    `insert into public.song_search_results (query, youtube_id, title, channel_title, duration_seconds, generation)
     values ($1,$2,$3,'Fixture channel',180,$4) returning id`,
    [`fixture ${randomUUID()}`, youtubeId, `Permission song ${youtubeId}`, randomUUID()]);
  songs.push(row.rows[0].id);
  return row.rows[0].id;
}

async function permissionsFor(roomId: string) {
  const client = await getDb().connect();
  try { return await readGuestPermissions(client, roomId); }
  finally { client.release(); }
}

test("new rooms keep the default guest permissions and snapshots expose them", async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  assert.deepEqual(await permissionsFor(host.room.id), { addSongs: true, queueControl: false, playbackControl: false, reactions: true });
  assert.deepEqual((await queueSnapshot(host.room.id)).guestPermissions, await permissionsFor(host.room.id));
});

test("each disabled permission is rejected by its server boundary and re-enabling restores it", async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  const guest = await joinRoom(host.room.code, "Remote", undefined);
  const guestId = guest.guest.id;
  const [first, second] = await Promise.all(["pBcDeFgHi01", "pBcDeFgHi02"].map(seedSong));
  const add = (searchResultId: string) => addQueueItem({ roomId: host.room.id, role: "guest", guestId, searchResultId, singerName: "Remote", requestKey: randomUUID() });

  await updateGuestPermissions(host.room.id, { addSongs: false });
  await assert.rejects(add(first), (error: unknown) => error instanceof QueueError && error.reason === "forbidden");
  await updateGuestPermissions(host.room.id, { addSongs: true });
  await add(first);
  const snapshot = await add(second);

  const move = () => mutateQueue({ roomId: host.room.id, role: "guest", guestId, id: snapshot.items[1].id, action: "up", expectedVersion: snapshot.version + 1 });
  await assert.rejects(move(), (error: unknown) => error instanceof QueueError && error.reason === "forbidden");
  await updateGuestPermissions(host.room.id, { queueControl: true });
  // The permission change publishes a queue version, so read it fresh.
  const latest = await queueSnapshot(host.room.id);
  const moved = await mutateQueue({ roomId: host.room.id, role: "guest", guestId, id: latest.items[1].id, action: "up", expectedVersion: latest.version });
  assert.equal(moved.items[0].id, latest.items[1].id);

  await assert.rejects(
    hostPlaybackCommand(host.room.id, "start", randomUUID(), { role: "guest", guestId }),
    (error: unknown) => error instanceof PlaybackError && error.reason === "not_allowed",
  );
  await updateGuestPermissions(host.room.id, { playbackControl: true });
  // Allowed now; with no paired TV the command fails on the device rule instead.
  await assert.rejects(
    hostPlaybackCommand(host.room.id, "start", randomUUID(), { role: "guest", guestId }),
    (error: unknown) => error instanceof PlaybackError && error.reason === "no_device",
  );

  await updateGuestPermissions(host.room.id, { reactions: false });
  await assert.rejects(
    sendRoomReaction({ roomId: host.room.id, role: "guest", guestId, reaction: "applause" }),
    (error: unknown) => error instanceof ReactionError && error.reason === "forbidden",
  );
});

test("hosts are never restricted by guest permissions", async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  await updateGuestPermissions(host.room.id, { addSongs: false, queueControl: false, playbackControl: false, reactions: false });
  const id = await seedSong("pBcDeFgHi03");
  const snapshot = await addQueueItem({ roomId: host.room.id, role: "host", searchResultId: id, singerName: "Host", requestKey: randomUUID() });
  assert.equal(snapshot.items.length, 1);
  await assert.rejects(
    hostPlaybackCommand(host.room.id, "start", randomUUID()),
    (error: unknown) => error instanceof PlaybackError && error.reason === "no_device",
  );
});

test("public database roles cannot change guest permissions", async () => {
  for (const role of ["anon", "authenticated"]) {
    const client = await getDb().connect();
    try {
      await client.query("begin");
      await client.query(`set local role ${role}`);
      await assert.rejects(
        client.query("update public.room_settings set guest_playback_control = true"),
        (error: unknown) => (error as { code?: string }).code === "42501",
      );
    } finally {
      await client.query("rollback");
      client.release();
    }
  }
});
