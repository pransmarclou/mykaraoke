import { createHash, randomInt, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getDb } from "@/lib/db";
import { credentialDigest, newHostCredential, normalizeRoomCode } from "@/lib/rooms/room-code";
import { commandReplayDecision, playerEventTransition, shouldAutoCueAfterPair, type PlayerEvent } from "@/lib/playback/rules";
import { canUse, type GuestPermissions } from "@/lib/permissions/rules";
import { readGuestPermissions } from "@/lib/permissions/state";
import { QueueError, reserveQueueMutation } from "@/lib/songs/queue";
import { readRoomPartyTheme } from "@/lib/themes/state";
import type { PartyThemeId } from "@/lib/themes/rules";

const PAIR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/u;

export type PlaybackSong = { id: string; youtubeId: string; title: string; channelTitle: string; singerName: string; duetSingerName: string | null; durationSeconds: number; requestedBy: string | null };
export type PlaybackSnapshot = {
  version: number;
  desired: "play" | "pause";
  observed: "idle" | "cued" | "playing" | "paused" | "blocked" | "error";
  errorCode: number | null;
  current: PlaybackSong | null;
  next: PlaybackSong | null;
  upNext: PlaybackSong[];
  queuedCount: number;
  devicePaired: boolean;
  tvConnected: boolean;
  guestPermissions: GuestPermissions;
  partyTheme: PartyThemeId;
};
export class PlaybackError extends Error {
  constructor(public readonly reason: "invalid" | "forbidden" | "not_allowed" | "limited" | "ended" | "empty" | "no_device" | "current" | "pair_invalid" | "pair_limited") { super(reason); }
}

type SongRow = { id: string; youtube_id: string; title: string; channel_title: string; singer_name: string; duet_singer_name: string | null; duration_seconds: number; requested_by: string | null };
type StateRow = { current_item_id: string | null; desired: PlaybackSnapshot["desired"]; observed: PlaybackSnapshot["observed"]; error_code: number | null; version: string; device_hash: Buffer | null; device_seen_at: Date | null };
function song(row: SongRow | undefined): PlaybackSong | null {
  return row ? { id: row.id, youtubeId: row.youtube_id, title: row.title, channelTitle: row.channel_title, singerName: row.singer_name, duetSingerName: row.duet_singer_name, durationSeconds: row.duration_seconds, requestedBy: row.requested_by } : null;
}
function pairDigest(code: string): Buffer { return createHash("sha256").update(code, "ascii").digest(); }
function validPairCode(code: string): boolean { return code.length === 8 && [...code].every((character) => PAIR_ALPHABET.includes(character)); }

async function ensureState(client: PoolClient, roomId: string) {
  await client.query("insert into public.playback_state (room_id) values ($1) on conflict do nothing", [roomId]);
}
async function lockOpenRoom(client: PoolClient, roomId: string) {
  const room = await client.query<{ status: string; expires_at: Date }>("select status, expires_at from public.rooms where id = $1 for update", [roomId]);
  if (!room.rows[0] || room.rows[0].status !== "open" || room.rows[0].expires_at <= new Date()) throw new PlaybackError("ended");
}
async function stateForRoom(client: PoolClient, roomId: string): Promise<StateRow | undefined> {
  const result = await client.query<StateRow>("select current_item_id, desired, observed, error_code, version, device_hash, device_seen_at from public.playback_state where room_id = $1", [roomId]);
  return result.rows[0];
}
async function currentSong(client: PoolClient, id: string | null): Promise<PlaybackSong | null> {
  if (!id) return null;
  const result = await client.query<SongRow>("select id, youtube_id, title, channel_title, singer_name, duet_singer_name, duration_seconds, requested_by from public.queue_items where id = $1", [id]);
  return song(result.rows[0]);
}
async function nextSong(client: PoolClient, roomId: string): Promise<PlaybackSong | null> {
  const result = await client.query<SongRow>("select id, youtube_id, title, channel_title, singer_name, duet_singer_name, duration_seconds, requested_by from public.queue_items where room_id = $1 and status = 'queued' order by position limit 1", [roomId]);
  return song(result.rows[0]);
}
async function upcomingSongs(client: PoolClient, roomId: string): Promise<{ items: PlaybackSong[]; total: number }> {
  const result = await client.query<SongRow & { queued_count: string }>(
    `select id, youtube_id, title, channel_title, singer_name, duet_singer_name, duration_seconds, requested_by,
            count(*) over()::text as queued_count
       from public.queue_items
      where room_id = $1 and status = 'queued'
      order by position
      limit 8`,
    [roomId],
  );
  return {
    items: result.rows.flatMap((row) => {
      const item = song(row);
      return item ? [item] : [];
    }),
    total: Number(result.rows[0]?.queued_count ?? 0),
  };
}
async function snapshot(client: PoolClient, roomId: string): Promise<PlaybackSnapshot> {
  const state = await stateForRoom(client, roomId);
  const current = await currentSong(client, state?.current_item_id ?? null);
  const upcoming = await upcomingSongs(client, roomId);
  return {
    version: Number(state?.version ?? 0), desired: state?.desired ?? "pause", observed: state?.observed ?? "idle",
    errorCode: state?.error_code ?? null, current,
    next: upcoming.items[0] ?? null, upNext: upcoming.items, queuedCount: upcoming.total,
    devicePaired: Boolean(state?.device_hash),
    tvConnected: Boolean(state?.device_seen_at && Date.now() - state.device_seen_at.getTime() < 20_000),
    guestPermissions: await readGuestPermissions(client, roomId),
    partyTheme: await readRoomPartyTheme(client, roomId),
  };
}
export async function playbackSnapshot(roomId: string): Promise<PlaybackSnapshot> {
  const client = await getDb().connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const value = await snapshot(client, roomId);
    await client.query("commit");
    return value;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function issueTvPairCode(roomId: string): Promise<string> {
  const code = Array.from({ length: 8 }, () => PAIR_ALPHABET[randomInt(PAIR_ALPHABET.length)]).join("");
  const client = await getDb().connect();
  try {
    await client.query("begin");
    await lockOpenRoom(client, roomId);
    await ensureState(client, roomId);
    await client.query("update public.playback_state set pairing_hash = $2, pairing_expires_at = now() + interval '10 minutes' where room_id = $1", [roomId, pairDigest(code)]);
    await client.query("commit");
    return code;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function provisionTv(roomId: string): Promise<{ credential: string; expiresAt: Date; autoStarted: boolean }> {
  const client = await getDb().connect();
  try {
    await client.query("begin");
    const room = await client.query<{ status: string; expires_at: Date }>("select status, expires_at from public.rooms where id = $1 for update", [roomId]);
    if (!room.rows[0] || room.rows[0].status !== "open" || room.rows[0].expires_at <= new Date()) throw new PlaybackError("ended");
    await ensureState(client, roomId);
    const credential = newHostCredential();
    await client.query(
      `update public.playback_state set device_hash = $2, device_seen_at = now(), pairing_hash = null,
       pairing_expires_at = null, version = version + 1, updated_at = now() where room_id = $1`,
      [roomId, credentialDigest(credential)],
    );
    const state = await stateForRoom(client, roomId);
    const queued = await client.query<{ count: string }>(
      "select count(*)::text as count from public.queue_items where room_id = $1 and status = 'queued'",
      [roomId],
    );
    const autoStarted = shouldAutoCueAfterPair(state?.current_item_id ?? null, Number(queued.rows[0]?.count ?? 0));
    if (autoStarted) {
      await cueNext(client, roomId);
      await publishQueueChange(client, roomId);
    }
    await client.query("commit");
    return { credential, expiresAt: room.rows[0].expires_at, autoStarted };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function pairTv(code: string, pairCode: string): Promise<{ credential: string; expiresAt: Date; autoStarted: boolean }> {
  if (!validPairCode(pairCode)) throw new PlaybackError("pair_invalid");
  const client = await getDb().connect();
  try {
    await client.query("begin");
    const room = await client.query<{ id: string; status: string; expires_at: Date }>("select id, status, expires_at from public.rooms where code = $1 for update", [normalizeRoomCode(code)]);
    if (!room.rows[0] || room.rows[0].status !== "open" || room.rows[0].expires_at <= new Date()) throw new PlaybackError("ended");
    const roomId = room.rows[0].id;
    const attempts = await client.query<{ attempts: number }>(
      `insert into public.playback_pair_limits (room_id, attempts) values ($1, 1)
       on conflict (room_id) do update set
         attempts = case when playback_pair_limits.window_started_at < now() - interval '10 minutes' then 1 else playback_pair_limits.attempts + 1 end,
         window_started_at = case when playback_pair_limits.window_started_at < now() - interval '10 minutes' then now() else playback_pair_limits.window_started_at end
       returning attempts`, [roomId]);
    if (attempts.rows[0].attempts > 10) {
      await client.query("commit");
      throw new PlaybackError("pair_limited");
    }
    await ensureState(client, roomId);
    const pair = await client.query<{ pairing_hash: Buffer | null }>(
      "select pairing_hash from public.playback_state where room_id = $1 and pairing_expires_at > now() for update", [roomId]);
    if (!pair.rows[0]?.pairing_hash?.equals(pairDigest(pairCode))) {
      await client.query("commit");
      throw new PlaybackError("pair_invalid");
    }
    const credential = newHostCredential();
    await client.query(
      `update public.playback_state set device_hash = $2, device_seen_at = now(), pairing_hash = null,
       pairing_expires_at = null, version = version + 1, updated_at = now() where room_id = $1`,
      [roomId, credentialDigest(credential)]);
    const state = await stateForRoom(client, roomId);
    const queued = await client.query<{ count: string }>(
      "select count(*)::text as count from public.queue_items where room_id = $1 and status = 'queued'",
      [roomId],
    );
    const autoStarted = shouldAutoCueAfterPair(state?.current_item_id ?? null, Number(queued.rows[0]?.count ?? 0));
    if (autoStarted) {
      await cueNext(client, roomId);
      await publishQueueChange(client, roomId);
    }
    await client.query("commit");
    return { credential, expiresAt: room.rows[0].expires_at, autoStarted };
  } catch (error) { if (!(error instanceof PlaybackError && ["pair_invalid", "pair_limited"].includes(error.reason))) await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function tvRoomAccess(code: string, credential: string | undefined): Promise<string | null> {
  const digest = credential ? credentialDigest(credential) : null;
  if (!digest) return null;
  const result = await getDb().query<{ id: string }>(
    `select r.id from public.rooms r join public.playback_state p on p.room_id = r.id
     where r.code = $1 and r.status = 'open' and r.expires_at > now() and p.device_hash = $2 limit 1`,
    [normalizeRoomCode(code), digest]);
  return result.rows[0]?.id ?? null;
}
export async function touchTv(roomId: string, credential: string): Promise<void> {
  const digest = credentialDigest(credential);
  if (!digest) return;
  await getDb().query("update public.playback_state set device_seen_at = now() where room_id = $1 and device_hash = $2", [roomId, digest]);
}

async function publishQueueChange(client: PoolClient, roomId: string) {
  const changed = await client.query<{ queue_version: string; queue_topic: string }>(
    "update public.rooms set queue_version = queue_version + 1 where id = $1 returning queue_version, queue_topic", [roomId]);
  await client.query("select realtime.send(jsonb_build_object('version', $1::bigint), 'queue_changed', $2, true)",
    [changed.rows[0].queue_version, `queue:${changed.rows[0].queue_topic}`]);
}
async function cueNext(client: PoolClient, roomId: string): Promise<string | null> {
  const next = await nextSong(client, roomId);
  if (!next) {
    await client.query("update public.playback_state set current_item_id = null, desired = 'pause', observed = 'idle', error_code = null, version = version + 1, updated_at = now() where room_id = $1", [roomId]);
    return null;
  }
  if (!VIDEO_ID.test(next.youtubeId)) throw new PlaybackError("invalid");
  await client.query("update public.queue_items set status = 'playing', position = null, updated_at = now() where id = $1 and room_id = $2 and status = 'queued'", [next.id, roomId]);
  await client.query("update public.playback_state set current_item_id = $2, desired = 'play', observed = 'cued', error_code = null, version = version + 1, updated_at = now() where room_id = $1", [roomId, next.id]);
  return next.id;
}

export type HostPlaybackAction = "start" | "pause" | "resume" | "skip";
export type PlaybackActor = { role: "host" } | { role: "guest"; guestId: string };
export async function hostPlaybackCommand(roomId: string, action: HostPlaybackAction, requestKey: string, actor: PlaybackActor = { role: "host" }): Promise<PlaybackSnapshot> {
  if (!UUID.test(requestKey)) throw new PlaybackError("invalid");
  if (actor.role === "guest" && !UUID.test(actor.guestId)) throw new PlaybackError("invalid");
  const client = await getDb().connect();
  try {
    await client.query("begin");
    await lockOpenRoom(client, roomId);
    if (!canUse(actor.role, await readGuestPermissions(client, roomId), "playbackControl")) throw new PlaybackError("not_allowed");
    await ensureState(client, roomId);
    const replay = await client.query<{ action: string }>("select action from public.playback_commands where room_id = $1 and request_key = $2", [roomId, requestKey]);
    const decision = commandReplayDecision(replay.rows[0]?.action, action);
    if (decision === "reject") throw new PlaybackError("invalid");
    if (decision === "replay") {
      const value = await snapshot(client, roomId);
      await client.query("commit");
      return value;
    }
    if (actor.role === "guest") {
      // Guest remotes share the per-guest queue mutation budget so one phone
      // cannot spam skips at the TV.
      await reserveQueueMutation(client, roomId, actor.guestId, 12).catch((error: unknown) => {
        throw error instanceof QueueError && error.reason === "limited" ? new PlaybackError("limited") : error;
      });
    }
    const state = (await stateForRoom(client, roomId))!;
    if (action === "start") {
      if (!state.device_hash) throw new PlaybackError("no_device");
      if (state.current_item_id) throw new PlaybackError("current");
      if (!await nextSong(client, roomId)) throw new PlaybackError("empty");
      await cueNext(client, roomId);
      await publishQueueChange(client, roomId);
    } else if (action === "skip") {
      if (!state.current_item_id) throw new PlaybackError("empty");
      await client.query("update public.queue_items set status = 'skipped', position = null, updated_at = now() where id = $1", [state.current_item_id]);
      await cueNext(client, roomId);
      await publishQueueChange(client, roomId);
    } else {
      if (!state.current_item_id) throw new PlaybackError("empty");
      await client.query("update public.playback_state set desired = $2, version = version + 1, updated_at = now() where room_id = $1", [roomId, action === "pause" ? "pause" : "play"]);
    }
    await client.query("insert into public.playback_commands (room_id, request_key, action) values ($1, $2, $3)", [roomId, requestKey, action]);
    const value = await snapshot(client, roomId);
    await client.query("commit");
    return value;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export type TvPlayerEvent = PlayerEvent;
export async function tvPlayerEvent(roomId: string, credential: string, itemId: string, event: TvPlayerEvent, errorCode?: number): Promise<PlaybackSnapshot> {
  if (!UUID.test(itemId)) throw new PlaybackError("invalid");
  const digest = credentialDigest(credential);
  if (!digest) throw new PlaybackError("forbidden");
  const client = await getDb().connect();
  try {
    await client.query("begin");
    await lockOpenRoom(client, roomId);
    const state = await stateForRoom(client, roomId);
    if (!state?.device_hash?.equals(digest)) throw new PlaybackError("forbidden");
    const transition = playerEventTransition(state.current_item_id, itemId, state.observed, event, state.error_code, errorCode);
    if (transition !== "ignore") {
      if (transition === "advance") {
        await client.query("update public.queue_items set status = 'played', position = null, updated_at = now() where id = $1", [itemId]);
        await cueNext(client, roomId);
        await publishQueueChange(client, roomId);
      } else {
        const code = event === "error" && Number.isInteger(errorCode) ? errorCode : null;
        await client.query("update public.playback_state set observed = $2, desired = case when $2 = 'error' then 'pause' else desired end, error_code = $3, version = version + 1, updated_at = now() where room_id = $1", [roomId, event, code]);
      }
    }
    await client.query("update public.playback_state set device_seen_at = now() where room_id = $1", [roomId]);
    const value = await snapshot(client, roomId);
    await client.query("commit");
    return value;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export function newPlaybackRequestKey(): string { return randomUUID(); }
