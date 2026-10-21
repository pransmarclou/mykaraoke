import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { getDb } from "../../src/lib/db";
import { updateGuestPermissions } from "../../src/lib/permissions/state";
import { createHostRoom } from "../../src/lib/rooms/repository";
import { joinRoom } from "../../src/lib/rooms/guests";
import { ratePerformance, ScoreError, scoreSnapshot } from "../../src/lib/scores/state";
import { addQueueItem } from "../../src/lib/songs/queue";

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
    [`fixture ${randomUUID()}`, youtubeId, `Score song ${youtubeId}`, randomUUID()]);
  songs.push(row.rows[0].id);
  return row.rows[0].id;
}

// Fixture shortcut: put a queued item on stage without a paired TV.
async function putOnStage(roomId: string, itemId: string) {
  await getDb().query("update public.queue_items set status = 'playing', position = null where id = $1", [itemId]);
  await getDb().query(
    `insert into public.playback_state (room_id, current_item_id, desired, observed) values ($1, $2, 'play', 'playing')
     on conflict (room_id) do update set current_item_id = excluded.current_item_id, desired = 'play', observed = 'playing'`,
    [roomId, itemId]);
}
async function finishStage(roomId: string, itemId: string) {
  await getDb().query("update public.queue_items set status = 'played' where id = $1", [itemId]);
  await getDb().query("update public.playback_state set current_item_id = null, desired = 'pause', observed = 'idle' where room_id = $1", [roomId]);
}

test("participants rate the live song once each, can change it, and the leaderboard groups by performer", async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  const guest = await joinRoom(host.room.code, "Fan", undefined);
  const guestActor = { role: "guest" as const, guestId: guest.guest.id };
  const [first, second] = await Promise.all(["sBcDeFgHi01", "sBcDeFgHi02"].map(seedSong));
  const queue = await addQueueItem({ roomId: host.room.id, role: "host", searchResultId: first, singerName: "Alex", requestKey: randomUUID() });
  const itemId = queue.items[0].id;

  assert.equal((await scoreSnapshot(host.room.id, { role: "host" })).target, null);
  await assert.rejects(ratePerformance({ roomId: host.room.id, actor: { role: "host" }, itemId, stars: 5 }), (error: unknown) => error instanceof ScoreError && error.reason === "closed");

  await putOnStage(host.room.id, itemId);
  await ratePerformance({ roomId: host.room.id, actor: { role: "host" }, itemId, stars: 5 });
  await ratePerformance({ roomId: host.room.id, actor: guestActor, itemId, stars: 2 });
  const changed = await ratePerformance({ roomId: host.room.id, actor: guestActor, itemId, stars: 4 });
  assert.equal(changed.target?.ratings, 2);
  assert.equal(changed.target?.average, 4.5);
  assert.equal(changed.target?.myRating, 4);
  assert.deepEqual(changed.leaderboard, [{ performer: "Alex", average: 4.5, ratings: 2, songs: 1 }]);
  const tv = await scoreSnapshot(host.room.id, { role: "tv" });
  assert.equal(tv.canRate, false);
  assert.equal(tv.target?.myRating, null);

  // Just-finished song stays rateable until the next one starts.
  await finishStage(host.room.id, itemId);
  assert.equal((await scoreSnapshot(host.room.id, guestActor)).target?.live, false);
  const next = await addQueueItem({ roomId: host.room.id, role: "host", searchResultId: second, singerName: "Sam", requestKey: randomUUID() });
  await putOnStage(host.room.id, next.items[0].id);
  await assert.rejects(ratePerformance({ roomId: host.room.id, actor: guestActor, itemId, stars: 1 }), (error: unknown) => error instanceof ScoreError && error.reason === "closed");

  for (const stars of [0, 6, 2.5, "5"]) {
    await assert.rejects(ratePerformance({ roomId: host.room.id, actor: guestActor, itemId: next.items[0].id, stars }), (error: unknown) => error instanceof ScoreError && error.reason === "invalid");
  }
});

test("turning guest ratings off is enforced while the host can still rate", async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  const guest = await joinRoom(host.room.code, "Quiet", undefined);
  const id = await seedSong("sBcDeFgHi03");
  const queue = await addQueueItem({ roomId: host.room.id, role: "host", searchResultId: id, singerName: "Host", requestKey: randomUUID() });
  await putOnStage(host.room.id, queue.items[0].id);
  await updateGuestPermissions(host.room.id, { ratings: false });
  const actor = { role: "guest" as const, guestId: guest.guest.id };
  assert.equal((await scoreSnapshot(host.room.id, actor)).canRate, false);
  await assert.rejects(ratePerformance({ roomId: host.room.id, actor, itemId: queue.items[0].id, stars: 3 }), (error: unknown) => error instanceof ScoreError && error.reason === "forbidden");
  await ratePerformance({ roomId: host.room.id, actor: { role: "host" }, itemId: queue.items[0].id, stars: 3 });
});

test("public database roles cannot read or write ratings", async () => {
  for (const role of ["anon", "authenticated"]) {
    for (const statement of [
      "select * from public.performance_ratings limit 1",
      "insert into public.performance_ratings default values",
      "update public.performance_ratings set stars = 5",
      "delete from public.performance_ratings",
    ]) {
      const client = await getDb().connect();
      try {
        await client.query("begin");
        await client.query(`set local role ${role}`);
        await assert.rejects(client.query(statement), (error: unknown) => (error as { code?: string }).code === "42501");
      } finally {
        await client.query("rollback");
        client.release();
      }
    }
  }
});
