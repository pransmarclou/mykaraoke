import type { PoolClient } from "pg";
import { getDb } from "@/lib/db";
import { DEFAULT_GUEST_PERMISSIONS, type GuestPermissions } from "@/lib/permissions/rules";

export class PermissionError extends Error {
  constructor(public readonly reason: "invalid" | "ended") { super(reason); }
}

type Row = { allow_guest_songs: boolean; guest_queue_control: boolean; guest_playback_control: boolean; guest_reactions: boolean; guest_ratings: boolean };

export async function readGuestPermissions(client: PoolClient, roomId: string): Promise<GuestPermissions> {
  const result = await client.query<Row>(
    `select allow_guest_songs, guest_queue_control, guest_playback_control, guest_reactions, guest_ratings
       from public.room_settings where room_id = $1`,
    [roomId],
  );
  const row = result.rows[0];
  if (!row) return { ...DEFAULT_GUEST_PERMISSIONS };
  return {
    addSongs: row.allow_guest_songs,
    queueControl: row.guest_queue_control,
    playbackControl: row.guest_playback_control,
    reactions: row.guest_reactions,
    ratings: row.guest_ratings,
  };
}

export async function updateGuestPermissions(roomId: string, patch: Partial<GuestPermissions>): Promise<GuestPermissions> {
  if (Object.keys(patch).length === 0) throw new PermissionError("invalid");
  const client = await getDb().connect();
  try {
    await client.query("begin");
    const room = await client.query<{ status: string; expires_at: Date }>(
      "select status, expires_at from public.rooms where id = $1 for update",
      [roomId],
    );
    if (!room.rows[0] || room.rows[0].status !== "open" || room.rows[0].expires_at <= new Date()) throw new PermissionError("ended");
    await client.query(
      `update public.room_settings set
         allow_guest_songs = coalesce($2, allow_guest_songs),
         guest_queue_control = coalesce($3, guest_queue_control),
         guest_playback_control = coalesce($4, guest_playback_control),
         guest_reactions = coalesce($5, guest_reactions),
         guest_ratings = coalesce($6, guest_ratings)
       where room_id = $1`,
      [roomId, patch.addSongs ?? null, patch.queueControl ?? null, patch.playbackControl ?? null, patch.reactions ?? null, patch.ratings ?? null],
    );
    // Bumping the queue version makes every connected phone refetch its
    // snapshot, so a disabled control disappears without a page reload.
    const changed = await client.query<{ queue_version: string; queue_topic: string }>(
      "update public.rooms set queue_version = queue_version + 1 where id = $1 returning queue_version, queue_topic",
      [roomId],
    );
    await client.query(
      "select realtime.send(jsonb_build_object('version', $1::bigint), 'queue_changed', $2, true)",
      [changed.rows[0].queue_version, `queue:${changed.rows[0].queue_topic}`],
    );
    const value = await readGuestPermissions(client, roomId);
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
