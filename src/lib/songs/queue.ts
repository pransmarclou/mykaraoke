import type { PoolClient } from "pg";
import { getDb } from "@/lib/db";
import { fairSingerOrder } from "@/lib/songs/rotation";
import { normalizeSingerAssignment, type SingerAssignment } from "@/lib/songs/singers";

export type QueueItem = {
  id: string;
  youtubeId: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  singerName: string;
  duetSingerName: string | null;
  requestedBy: string | null;
  position: number;
};
export type QueueSnapshot = { version: number; items: QueueItem[]; fairRotation: boolean };
export class QueueError extends Error {
  constructor(public readonly reason: "invalid" | "stale" | "duplicate" | "limit" | "limited" | "missing" | "ended") { super(reason); }
}

type Row = { id: string; youtube_id: string; title: string; channel_title: string; duration_seconds: number; singer_name: string; duet_singer_name: string | null; requested_by: string | null; position: number };
function toItem(row: Row): QueueItem {
  return { id: row.id, youtubeId: row.youtube_id, title: row.title, channelTitle: row.channel_title, durationSeconds: row.duration_seconds, singerName: row.singer_name, duetSingerName: row.duet_singer_name, requestedBy: row.requested_by, position: row.position };
}
export function movedIds(ids: string[], id: string, direction: "up" | "down"): string[] {
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) throw new QueueError("missing");
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

async function lockRoom(client: PoolClient, roomId: string): Promise<number> {
  const room = await client.query<{ queue_version: string; status: string; expires_at: Date }>(
    "select queue_version, status, expires_at from public.rooms where id = $1 for update", [roomId]);
  if (!room.rows[0] || room.rows[0].status !== "open" || room.rows[0].expires_at <= new Date()) throw new QueueError("ended");
  return Number(room.rows[0].queue_version);
}
async function rowsForRoom(client: PoolClient, roomId: string): Promise<Row[]> {
  const rows = await client.query<Row>(
    `select id, youtube_id, title, channel_title, duration_seconds, singer_name, duet_singer_name, requested_by, position
       from public.queue_items where room_id = $1 and status = 'queued' order by position`, [roomId]);
  return rows.rows;
}

async function fairRotationEnabled(client: PoolClient, roomId: string): Promise<boolean> {
  const result = await client.query<{ fair_rotation_enabled: boolean }>(
    "select fair_rotation_enabled from public.room_settings where room_id = $1",
    [roomId],
  );
  return result.rows[0]?.fair_rotation_enabled ?? false;
}

async function currentSinger(client: PoolClient, roomId: string): Promise<SingerAssignment | null> {
  const result = await client.query<{ singer_name: string; duet_singer_name: string | null }>(
    `select q.singer_name, q.duet_singer_name
       from public.playback_state p
       join public.queue_items q on q.id = p.current_item_id
      where p.room_id = $1 limit 1`,
    [roomId],
  );
  const row = result.rows[0];
  return row ? { singerName: row.singer_name, duetSingerName: row.duet_singer_name } : null;
}

async function writeOrder(client: PoolClient, roomId: string, rows: readonly Row[]): Promise<void> {
  for (let index = 0; index < rows.length; index += 1) {
    await client.query(
      "update public.queue_items set position = $3, updated_at = now() where room_id = $1 and id = $2",
      [roomId, rows[index].id, index + 1],
    );
  }
}

async function applyFairRotation(client: PoolClient, roomId: string): Promise<void> {
  const rows = await rowsForRoom(client, roomId);
  const sortable = rows.map((row) => ({ ...row, singerName: row.singer_name, duetSingerName: row.duet_singer_name }));
  await writeOrder(client, roomId, fairSingerOrder(sortable, await currentSinger(client, roomId)));
}

async function snapshot(client: PoolClient, roomId: string): Promise<QueueSnapshot> {
  const room = await client.query<{ queue_version: string }>("select queue_version from public.rooms where id = $1", [roomId]);
  return {
    version: Number(room.rows[0]?.queue_version ?? 0),
    items: (await rowsForRoom(client, roomId)).map(toItem),
    fairRotation: await fairRotationEnabled(client, roomId),
  };
}
async function publish(client: PoolClient, roomId: string): Promise<number> {
  const changed = await client.query<{ queue_version: string; queue_topic: string }>(
    "update public.rooms set queue_version = queue_version + 1 where id = $1 returning queue_version, queue_topic", [roomId]);
  await client.query(
    "select realtime.send(jsonb_build_object('version', $1::bigint), 'queue_changed', $2, true)",
    [changed.rows[0].queue_version, `queue:${changed.rows[0].queue_topic}`],
  );
  return Number(changed.rows[0].queue_version);
}

export async function reserveQueueMutation(client: PoolClient, roomId: string, actorKey: string, limit: number, now = new Date()): Promise<void> {
  const result = await client.query<{ mutations: number }>(
    `insert into public.queue_mutation_limits (room_id, actor_key, window_started_at, mutations)
     values ($1, $2, $3, 1)
     on conflict (room_id, actor_key) do update set
       window_started_at = case when queue_mutation_limits.window_started_at <= $3::timestamptz - interval '1 minute' then $3 else queue_mutation_limits.window_started_at end,
       mutations = case when queue_mutation_limits.window_started_at <= $3::timestamptz - interval '1 minute' then 1 else least(queue_mutation_limits.mutations + 1, $4::integer + 1) end
     returning mutations`, [roomId, actorKey, now, limit],
  );
  if (result.rows[0].mutations > limit) throw new QueueError("limited");
}

export async function queueSnapshot(roomId: string): Promise<QueueSnapshot> {
  const client = await getDb().connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const value = await snapshot(client, roomId);
    await client.query("commit");
    return value;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
export async function addQueueItem(input: { roomId: string; role: "host" | "guest"; guestId?: string; searchResultId: string; singerName: unknown; duetSingerName?: unknown; requestKey: string }): Promise<QueueSnapshot> {
  if (!UUID.test(input.searchResultId) || !UUID.test(input.requestKey)) throw new QueueError("invalid");
  const singers = normalizeSingerAssignment(input.singerName, input.duetSingerName);
  const actorKey = input.role === "host" ? "host" : input.guestId;
  if (!actorKey) throw new QueueError("invalid");
  const client = await getDb().connect();
  try {
    await client.query("begin");
    await lockRoom(client, input.roomId);
    const replay = await client.query("select 1 from public.queue_items where room_id = $1 and actor_key = $2 and request_key = $3", [input.roomId, actorKey, input.requestKey]);
    if (replay.rows[0]) {
      const value = await snapshot(client, input.roomId);
      await client.query("commit");
      return value;
    }
    const song = await client.query<{ youtube_id: string; title: string; channel_title: string; duration_seconds: number }>(
      `select youtube_id, title, channel_title, duration_seconds from public.song_search_results
       where id = $1 and fetched_at > now() - interval '6 hours'`, [input.searchResultId]);
    if (!song.rows[0]) throw new QueueError("invalid");
    const duplicates = await client.query(
      "select 1 from public.queue_items where room_id = $1 and actor_key = $2 and youtube_id = $3 and status in ('queued', 'playing')", [input.roomId, actorKey, song.rows[0].youtube_id]);
    if (duplicates.rows[0]) throw new QueueError("duplicate");
    if (input.role === "guest") {
      const count = await client.query<{ count: string }>("select count(*)::text as count from public.queue_items where room_id = $1 and actor_key = $2 and status in ('queued', 'playing')", [input.roomId, actorKey]);
      if (Number(count.rows[0].count) >= 3) throw new QueueError("limit");
    }
    await reserveQueueMutation(client, input.roomId, actorKey, input.role === "guest" ? 12 : 40);
    const position = await client.query<{ position: number }>("select coalesce(max(position), 0) + 1 as position from public.queue_items where room_id = $1 and status = 'queued'", [input.roomId]);
    await client.query(
      `insert into public.queue_items (room_id, search_result_id, youtube_id, title, channel_title, duration_seconds, singer_name, duet_singer_name, requested_by, actor_key, request_key, position)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [input.roomId, input.searchResultId, song.rows[0].youtube_id, song.rows[0].title, song.rows[0].channel_title, song.rows[0].duration_seconds, singers.singerName, singers.duetSingerName, input.guestId ?? null, actorKey, input.requestKey, position.rows[0].position]);
    if (await fairRotationEnabled(client, input.roomId)) await applyFairRotation(client, input.roomId);
    await publish(client, input.roomId);
    const value = await snapshot(client, input.roomId);
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}

export async function mutateQueue(input: { roomId: string; id: string; action: "remove" | "skip" | "up" | "down"; expectedVersion: number }): Promise<QueueSnapshot> {
  if (!UUID.test(input.id) || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw new QueueError("invalid");
  const client = await getDb().connect();
  try {
    await client.query("begin");
    const version = await lockRoom(client, input.roomId);
    if (version !== input.expectedVersion) throw new QueueError("stale");
    const rows = await rowsForRoom(client, input.roomId);
    if (!rows.some((row) => row.id === input.id)) throw new QueueError("missing");
    await reserveQueueMutation(client, input.roomId, "host", 40);
    if (input.action === "remove" || input.action === "skip") {
      await client.query("update public.queue_items set status = $3, position = null, updated_at = now() where room_id = $1 and id = $2", [input.roomId, input.id, input.action === "skip" ? "skipped" : "removed"]);
    } else {
      const order = movedIds(rows.map((row) => row.id), input.id, input.action);
      await writeOrder(client, input.roomId, order.map((id) => rows.find((row) => row.id === id)!));
      await client.query("update public.room_settings set fair_rotation_enabled = false where room_id = $1", [input.roomId]);
    }
    await publish(client, input.roomId);
    const value = await snapshot(client, input.roomId);
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); }
}

export async function setFairRotation(roomId: string, enabled: boolean, expectedVersion: number): Promise<QueueSnapshot> {
  if (typeof enabled !== "boolean" || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new QueueError("invalid");
  const client = await getDb().connect();
  try {
    await client.query("begin");
    const version = await lockRoom(client, roomId);
    if (version !== expectedVersion) throw new QueueError("stale");
    await reserveQueueMutation(client, roomId, "host", 40);
    await client.query("update public.room_settings set fair_rotation_enabled = $2 where room_id = $1", [roomId, enabled]);
    if (enabled) await applyFairRotation(client, roomId);
    await publish(client, roomId);
    const value = await snapshot(client, roomId);
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
