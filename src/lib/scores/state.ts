import type { PoolClient } from "pg";
import { getDb } from "@/lib/db";
import { canUse } from "@/lib/permissions/rules";
import { readGuestPermissions } from "@/lib/permissions/state";
import { ReactionError, reserveReaction } from "@/lib/reactions/state";
import { averageStars, buildLeaderboard, isStarRating, type LeaderboardEntry } from "@/lib/scores/rules";
import { singerLabel } from "@/lib/songs/singers";

export class ScoreError extends Error {
  constructor(public readonly reason: "invalid" | "ended" | "forbidden" | "closed" | "limited") { super(reason); }
}

export type ScoreActor = { role: "host" } | { role: "guest"; guestId: string } | { role: "tv" };
export type RatingTarget = {
  itemId: string;
  title: string;
  performer: string;
  live: boolean;
  average: number;
  ratings: number;
  myRating: number | null;
};
export type ScoreSnapshot = { target: RatingTarget | null; leaderboard: LeaderboardEntry[]; canRate: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function actorKey(actor: ScoreActor): string | null {
  if (actor.role === "host") return "host";
  if (actor.role === "guest") return `guest:${actor.guestId}`;
  return null;
}

// The rateable performance is the song on stage, or, between songs, the one
// that most recently finished playing. Skipped songs are never rateable.
async function ratingTarget(client: PoolClient, roomId: string): Promise<{ id: string; title: string; singer_name: string; duet_singer_name: string | null; live: boolean } | null> {
  const result = await client.query<{ id: string; title: string; singer_name: string; duet_singer_name: string | null; live: boolean }>(
    `select q.id, q.title, q.singer_name, q.duet_singer_name, q.status = 'playing' as live
       from public.queue_items q
      where q.room_id = $1 and (
        q.id = (select current_item_id from public.playback_state where room_id = $1)
        or (q.status = 'played' and not exists (
              select 1 from public.playback_state p where p.room_id = $1 and p.current_item_id is not null)))
      order by (q.status = 'playing') desc, q.updated_at desc
      limit 1`,
    [roomId],
  );
  return result.rows[0] ?? null;
}

async function snapshot(client: PoolClient, roomId: string, actor: ScoreActor): Promise<ScoreSnapshot> {
  const target = await ratingTarget(client, roomId);
  const rows = await client.query<{ item_id: string; singer_name: string; duet_singer_name: string | null; stars: number }>(
    `select r.queue_item_id as item_id, q.singer_name, q.duet_singer_name, r.stars
       from public.performance_ratings r
       join public.queue_items q on q.id = r.queue_item_id
      where r.room_id = $1
      order by r.created_at`,
    [roomId],
  );
  const permissions = await readGuestPermissions(client, roomId);
  const key = actorKey(actor);
  let value: RatingTarget | null = null;
  if (target) {
    const own = rows.rows.filter((row) => row.item_id === target.id);
    const mine = key
      ? (await client.query<{ stars: number }>("select stars from public.performance_ratings where queue_item_id = $1 and actor_key = $2", [target.id, key])).rows[0]
      : undefined;
    value = {
      itemId: target.id,
      title: target.title,
      performer: singerLabel({ singerName: target.singer_name, duetSingerName: target.duet_singer_name }),
      live: target.live,
      average: averageStars(own.reduce((sum, row) => sum + row.stars, 0), own.length),
      ratings: own.length,
      myRating: mine?.stars ?? null,
    };
  }
  return {
    target: value,
    leaderboard: buildLeaderboard(rows.rows.map((row) => ({ itemId: row.item_id, singerName: row.singer_name, duetSingerName: row.duet_singer_name, stars: row.stars }))),
    canRate: actor.role !== "tv" && canUse(actor.role, permissions, "ratings"),
  };
}

export async function scoreSnapshot(roomId: string, actor: ScoreActor): Promise<ScoreSnapshot> {
  const client = await getDb().connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const value = await snapshot(client, roomId, actor);
    await client.query("commit");
    return value;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

export async function ratePerformance(input: { roomId: string; actor: ScoreActor; itemId: unknown; stars: unknown }): Promise<ScoreSnapshot> {
  const key = actorKey(input.actor);
  if (!key || typeof input.itemId !== "string" || !UUID.test(input.itemId) || !isStarRating(input.stars)) throw new ScoreError("invalid");
  if (input.actor.role === "guest" && !UUID.test(input.actor.guestId)) throw new ScoreError("invalid");
  const client = await getDb().connect();
  try {
    await client.query("begin");
    const room = await client.query<{ status: string; expires_at: Date }>("select status, expires_at from public.rooms where id = $1 for update", [input.roomId]);
    if (!room.rows[0] || room.rows[0].status !== "open" || room.rows[0].expires_at <= new Date()) throw new ScoreError("ended");
    if (input.actor.role === "guest" && !canUse("guest", await readGuestPermissions(client, input.roomId), "ratings")) throw new ScoreError("forbidden");
    const target = await ratingTarget(client, input.roomId);
    if (!target || target.id !== input.itemId) throw new ScoreError("closed");
    await reserveReaction(client, input.roomId, `rating:${key}`).catch((error: unknown) => {
      throw error instanceof ReactionError && error.reason === "limited" ? new ScoreError("limited") : error;
    });
    await client.query(
      `insert into public.performance_ratings (room_id, queue_item_id, actor_key, stars)
       values ($1, $2, $3, $4)
       on conflict (queue_item_id, actor_key) do update set stars = excluded.stars, updated_at = now()`,
      [input.roomId, input.itemId, key, input.stars],
    );
    const value = await snapshot(client, input.roomId, input.actor);
    await client.query("commit");
    return value;
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
