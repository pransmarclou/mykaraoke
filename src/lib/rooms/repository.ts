import type { DatabaseError } from "pg";
import { getDb } from "@/lib/db";
import {
  credentialDigest,
  makeRoomCode,
  newHostCredential,
  normalizeRoomCode,
  roomExpiresAt,
} from "@/lib/rooms/room-code";

export type HostRoom = {
  id: string;
  code: string;
  createdAt: Date;
  expiresAt: Date;
};

type RoomRow = { id: string; code: string; created_at: Date; expires_at: Date };

function toHostRoom(row: RoomRow): HostRoom {
  return { id: row.id, code: row.code, createdAt: row.created_at, expiresAt: row.expires_at };
}

export async function createHostRoom(options: { now?: Date; codeGenerator?: () => string } = {}): Promise<{ room: HostRoom; credential: string }> {
  const now = options.now ?? new Date();
  const expiresAt = roomExpiresAt(now);
  const codeGenerator = options.codeGenerator ?? makeRoomCode;
  const pool = getDb();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = codeGenerator();
    const credential = newHostCredential();
    const digest = credentialDigest(credential);
    if (!digest) throw new Error("Failed to generate host credential");
    const client = await pool.connect();

    try {
      await client.query("begin");
      const inserted = await client.query<RoomRow>(
        "insert into public.rooms (code, created_at, expires_at) values ($1, $2, $3) returning id, code, created_at, expires_at",
        [code, now, expiresAt],
      );
      const room = toHostRoom(inserted.rows[0]);
      await client.query("insert into public.room_settings (room_id) values ($1)", [room.id]);
      await client.query(
        "insert into public.room_sessions (room_id, role, credential_hash, created_at, expires_at) values ($1, 'host', $2, $3, $4)",
        [room.id, digest, now, expiresAt],
      );
      await client.query("delete from public.rooms where expires_at < now() - interval '7 days'");
      await client.query("delete from public.room_creation_limits where window_started_at < now() - interval '2 hours'");
      await client.query("commit");
      return { room, credential };
    } catch (error) {
      await client.query("rollback");
      const dbError = error as DatabaseError;
      if (dbError.code === "23505" && dbError.constraint === "rooms_code_key") continue;
      throw error;
    } finally {
      client.release();
    }
  }

  throw new Error("Could not allocate a unique room code");
}

export async function getActiveHostRoom(credential: string | undefined): Promise<HostRoom | null> {
  const digest = credential ? credentialDigest(credential) : null;
  if (!digest) return null;
  const result = await getDb().query<RoomRow>(
    `select r.id, r.code, r.created_at, r.expires_at
       from public.room_sessions s
       join public.rooms r on r.id = s.room_id
      where s.credential_hash = $1 and s.role = 'host'
        and s.revoked_at is null and s.expires_at > now()
        and r.status = 'open' and r.expires_at > now()
      limit 1`,
    [digest],
  );
  return result.rows[0] ? toHostRoom(result.rows[0]) : null;
}

export async function closeHostRoom(code: string, credential: string | undefined): Promise<boolean> {
  const digest = credential ? credentialDigest(credential) : null;
  if (!digest) return false;

  const client = await getDb().connect();
  try {
    await client.query("begin");
    const result = await client.query<{ id: string }>(
      `update public.rooms r
          set status = 'closed', closed_at = now()
        where r.code = $1 and r.status = 'open' and r.expires_at > now()
          and exists (
            select 1 from public.room_sessions s
             where s.room_id = r.id and s.credential_hash = $2
               and s.role = 'host' and s.revoked_at is null and s.expires_at > now()
          )
      returning r.id`,
      [normalizeRoomCode(code), digest],
    );
    if (result.rows[0]) {
      await client.query("update public.room_sessions set revoked_at = now() where room_id = $1 and revoked_at is null", [result.rows[0].id]);
    }
    await client.query("commit");
    return Boolean(result.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function cleanupExpiredRooms(now = new Date()): Promise<{ closed: number; deleted: number }> {
  const client = await getDb().connect();
  try {
    await client.query("begin");
    const closed = await client.query<{ id: string }>(
      `update public.rooms set status = 'closed', closed_at = $1
        where status = 'open' and expires_at <= $1 returning id`, [now],
    );
    if (closed.rows.length) {
      const ids = closed.rows.map((room) => room.id);
      await client.query("update public.room_sessions set revoked_at = $2 where room_id = any($1::uuid[]) and revoked_at is null", [ids, now]);
      await client.query("update public.playback_state set device_hash = null, pairing_hash = null, pairing_expires_at = null where room_id = any($1::uuid[])", [ids]);
    }
    const deleted = await client.query<{ id: string }>("delete from public.rooms where expires_at < $1::timestamptz - interval '7 days' returning id", [now]);
    await client.query("delete from public.room_creation_limits where window_started_at < $1::timestamptz - interval '2 hours'", [now]);
    await client.query("delete from public.room_join_limits where window_started_at < $1::timestamptz - interval '2 hours'", [now]);
    await client.query("delete from public.room_presence where last_seen_at < $1::timestamptz - interval '1 day'", [now]);
    await client.query("commit");
    return { closed: closed.rows.length, deleted: deleted.rows.length };
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}
