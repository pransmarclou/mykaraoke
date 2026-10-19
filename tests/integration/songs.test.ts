import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { getDb } from "../../src/lib/db";
import { createHostRoom } from "../../src/lib/rooms/repository";
import { joinRoom, roomAccess } from "../../src/lib/rooms/guests";
import { addQueueItem, mutateQueue, queueSnapshot, QueueError, reserveQueueMutation } from "../../src/lib/songs/queue";
import { searchYouTube } from "../../src/lib/songs/youtube";

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
     values ($1,$2,$3,$4,$5,$6) returning id`,
    [`fixture ${randomUUID()}`, youtubeId, `Test song ${youtubeId}`, "Fixture channel", 180, randomUUID()]);
  songs.push(row.rows[0].id);
  return row.rows[0].id;
}

test("YouTube boundary maps a recorded-style fixture and sends required restrictions", async () => {
  const oldKey = process.env.YOUTUBE_API_KEY;
  process.env.YOUTUBE_API_KEY = "test-server-key";
  const requested: string[] = [];
  const fetcher = async (input: string | URL | Request) => {
    const url = new URL(String(input)); requested.push(url.pathname + url.search);
    if (url.pathname.endsWith("/search")) return Response.json({ items: [{ id: { videoId: "aBcDeFgHi01" }, snippet: { title: "Test karaoke", channelTitle: "Fixture channel" } }] });
    return Response.json({ items: [{ id: "aBcDeFgHi01", status: { embeddable: true, privacyStatus: "public" }, contentDetails: { duration: "PT3M" } }] });
  };
  try {
    const results = await searchYouTube("Test", fetcher as typeof fetch);
    assert.equal(results.length, 1);
    assert.equal(results[0].durationSeconds, 180);
    assert.match(requested[0], /videoEmbeddable=true/);
    assert.match(requested[0], /type=video/);
    assert.match(requested[1], /\/videos\?/);
  } finally { if (oldKey === undefined) delete process.env.YOUTUBE_API_KEY; else process.env.YOUTUBE_API_KEY = oldKey; }
});

test("concurrent adds serialize, idempotency holds, duplicates and guest limits are enforced", async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  const guest = await joinRoom(host.room.code, "Alex", undefined);
  const ids = await Promise.all(["aBcDeFgHi01", "aBcDeFgHi02", "aBcDeFgHi03", "aBcDeFgHi04"].map(seedSong));
  const input = (id: string, requestKey = randomUUID()) => ({ roomId: host.room.id, role: "guest" as const, guestId: guest.guest.id, searchResultId: id, singerName: "Alex", requestKey });
  const requestKey = randomUUID();
  const [first, second] = await Promise.all([addQueueItem(input(ids[0], requestKey)), addQueueItem(input(ids[1]))]);
  assert.equal(first.items.length + second.items.length >= 3, true);
  assert.deepEqual((await queueSnapshot(host.room.id)).items.map((item) => item.position), [1, 2]);
  assert.equal((await addQueueItem(input(ids[0], requestKey))).items.length, 2);
  await assert.rejects(addQueueItem(input(ids[0])), (error: unknown) => error instanceof QueueError && error.reason === "duplicate");
  await addQueueItem(input(ids[2]));
  await assert.rejects(addQueueItem(input(ids[3])), (error: unknown) => error instanceof QueueError && error.reason === "limit");
});

test("host mutations require current version and stay isolated to a room", async () => {
  const host = await createHostRoom(); const other = await createHostRoom(); rooms.push(host.room.id, other.room.id);
  const guest = await joinRoom(host.room.code, "Singer", undefined);
  const id1 = await seedSong("bBcDeFgHi01"); const id2 = await seedSong("bBcDeFgHi02");
  await addQueueItem({ roomId: host.room.id, role: "guest", guestId: guest.guest.id, searchResultId: id1, singerName: "Singer", requestKey: randomUUID() });
  await addQueueItem({ roomId: host.room.id, role: "guest", guestId: guest.guest.id, searchResultId: id2, singerName: "Singer", requestKey: randomUUID() });
  const before = await queueSnapshot(host.room.id);
  await assert.rejects(mutateQueue({ roomId: other.room.id, id: before.items[0].id, action: "skip", expectedVersion: 0 }), QueueError);
  const moved = await mutateQueue({ roomId: host.room.id, id: before.items[1].id, action: "up", expectedVersion: before.version });
  assert.equal(moved.items[0].id, before.items[1].id);
  await assert.rejects(mutateQueue({ roomId: host.room.id, id: before.items[0].id, action: "remove", expectedVersion: before.version }), (error: unknown) => error instanceof QueueError && error.reason === "stale");
  const skipped = await mutateQueue({ roomId: host.room.id, id: moved.items[0].id, action: "skip", expectedVersion: moved.version });
  assert.equal(skipped.items.length, 1);
  assert.equal((await queueSnapshot(other.room.id)).items.length, 0);
  assert.deepEqual(await roomAccess(host.room.code, undefined, guest.credential), { roomId: host.room.id, role: "guest", guestId: guest.guest.id, expiresAt: host.room.expiresAt });
  await assert.rejects(roomAccess(other.room.code, undefined, guest.credential), /access denied/);
});

test("queue write budget is scoped to an actor and resets after its window", async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  const client = await getDb().connect();
  const now = new Date();
  try {
    await client.query("begin");
    await reserveQueueMutation(client, host.room.id, "host", 2, now);
    await reserveQueueMutation(client, host.room.id, "host", 2, now);
    await assert.rejects(reserveQueueMutation(client, host.room.id, "host", 2, now), (error: unknown) => error instanceof QueueError && error.reason === "limited");
    await reserveQueueMutation(client, host.room.id, "guest:test", 2, now);
    await reserveQueueMutation(client, host.room.id, "host", 2, new Date(now.getTime() + 60_001));
    await client.query("commit");
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
});

test("public database roles cannot access search and queue tables", async () => {
  for (const role of ["anon", "authenticated"]) {
    for (const [table, column] of [["song_search_results", "fetched_at"], ["song_search_cache", "fetched_at"], ["song_search_usage", "api_calls"], ["song_search_limits", "requests"], ["queue_items", "created_at"], ["queue_mutation_limits", "mutations"]]) {
      for (const statement of [
        `select * from public.${table} limit 1`,
        `insert into public.${table} default values`,
        `update public.${table} set ${column} = ${column}`,
        `delete from public.${table}`,
      ]) {
        const client = await getDb().connect();
        try { await client.query("begin"); await client.query(`set local role ${role}`); await assert.rejects(client.query(statement), (error: unknown) => (error as { code?: string }).code === "42501"); }
        finally { await client.query("rollback"); client.release(); }
      }
    }
  }
});

test("private Supabase Realtime channel delivers only a version invalidation to an authorized room topic", { skip: !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY }, async () => {
  const host = await createHostRoom(); rooms.push(host.room.id);
  const song = await seedSong("dBcDeFgHi01");
  const topicResult = await getDb().query<{ queue_topic: string }>("select queue_topic from public.rooms where id = $1", [host.room.id]);
  const guard = await getDb().connect();
  try {
    await guard.query("begin");
    await guard.query("set local role anon");
    assert.equal((await guard.query<{ allowed: boolean }>("select public.can_read_queue_topic($1) as allowed", [`queue:${topicResult.rows[0].queue_topic}`])).rows[0].allowed, true);
    assert.equal((await guard.query<{ allowed: boolean }>("select public.can_read_queue_topic($1) as allowed", [`queue:${randomUUID()}`])).rows[0].allowed, false);
  } finally { await guard.query("rollback"); guard.release(); }
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  await client.realtime.setAuth(process.env.SUPABASE_ANON_KEY!);
  let receive: (version: number) => void = () => {};
  const received = new Promise<number>((resolve) => { receive = resolve; });
  let joined: (status: string) => void = () => {};
  const subscribed = new Promise<string>((resolve) => { joined = resolve; });
  const channel = client.channel(`queue:${topicResult.rows[0].queue_topic}`, { config: { private: true } })
    .on("broadcast", { event: "queue_changed" }, (message) => receive(Number(message.payload.version)))
    .subscribe((status) => joined(status));
  try {
    assert.equal(await withTimeout(subscribed, 15_000, "Realtime subscribe timeout"), "SUBSCRIBED");
    await addQueueItem({ roomId: host.room.id, role: "host", searchResultId: song, singerName: "Host", requestKey: randomUUID() });
    assert.equal(await withTimeout(received, 20_000, "Realtime event timeout"), 1);
  } finally { await client.removeChannel(channel); await client.realtime.disconnect(); }
});

async function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); })]);
  } finally { if (timer) clearTimeout(timer); }
}
