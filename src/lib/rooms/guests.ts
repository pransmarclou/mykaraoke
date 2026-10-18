import { getDb } from "@/lib/db";
import { displayLabel } from "@/lib/rooms/display-name";
import { isPresent, type Participant } from "@/lib/rooms/presence";
import { credentialDigest, newHostCredential, normalizeRoomCode } from "@/lib/rooms/room-code";

export class RoomJoinError extends Error {
  constructor(public readonly reason: "not_found" | "ended" | "full") {
    super(reason);
  }
}

type MemberRow = {
  id: string;
  room_id: string;
  code: string;
  display_name: string;
  name_number: number;
};

export type GuestMembership = {
  id: string;
  roomId: string;
  code: string;
  label: string;
};

function membership(row: MemberRow): GuestMembership {
  return { id: row.id, roomId: row.room_id, code: row.code, label: displayLabel(row.display_name, row.name_number) };
}

export async function getActiveGuest(code: string, credential: string | undefined): Promise<GuestMembership | null> {
  const digest = credential ? credentialDigest(credential) : null;
  if (!digest) return null;
  const result = await getDb().query<MemberRow>(
    `select m.id, m.room_id, r.code, m.display_name, m.name_number
       from public.room_members m join public.rooms r on r.id = m.room_id
      where r.code = $1 and m.credential_hash = $2 and m.left_at is null
        and r.status = 'open' and r.expires_at > now()
      limit 1`,
    [normalizeRoomCode(code), digest],
  );
  return result.rows[0] ? membership(result.rows[0]) : null;
}

export async function joinRoom(code: string, displayName: string, previousCredential: string | undefined): Promise<{ guest: GuestMembership; credential: string; reused: boolean; expiresAt: Date }> {
  const normalizedCode = normalizeRoomCode(code);
  const previousDigest = previousCredential ? credentialDigest(previousCredential) : null;
  const client = await getDb().connect();
  try {
    await client.query("begin");
    const roomResult = await client.query<{ id: string; status: string; expires_at: Date }>(
      "select id, status, expires_at from public.rooms where code = $1 for update",
      [normalizedCode],
    );
    const room = roomResult.rows[0];
    if (!room) throw new RoomJoinError("not_found");
    if (room.status !== "open" || room.expires_at <= new Date()) throw new RoomJoinError("ended");

    if (previousDigest) {
      const prior = await client.query<MemberRow>(
        `select m.id, m.room_id, r.code, m.display_name, m.name_number
           from public.room_members m join public.rooms r on r.id = m.room_id
          where m.credential_hash = $1 and m.left_at is null limit 1`,
        [previousDigest],
      );
      if (prior.rows[0]?.room_id === room.id) {
        await client.query(
          `insert into public.room_presence (member_id, last_seen_at) values ($1, now())
           on conflict (member_id) do update set last_seen_at = excluded.last_seen_at`,
          [prior.rows[0].id],
        );
        await client.query("commit");
        return { guest: membership(prior.rows[0]), credential: previousCredential!, reused: true, expiresAt: room.expires_at };
      }
    }

    const count = await client.query<{ count: string }>(
      "select count(*)::text as count from public.room_members where room_id = $1 and left_at is null",
      [room.id],
    );
    if (Number(count.rows[0].count) >= 50) throw new RoomJoinError("full");

    const numberResult = await client.query<{ next_number: number }>(
      `select coalesce(max(name_number), 0) + 1 as next_number from public.room_members
        where room_id = $1 and lower(display_name) = lower($2)`,
      [room.id, displayName],
    );
    const credential = newHostCredential();
    const digest = credentialDigest(credential)!;
    const inserted = await client.query<MemberRow>(
      `insert into public.room_members (room_id, display_name, name_number, credential_hash)
       values ($1, $2, $3, $4) returning id, room_id, display_name, name_number`,
      [room.id, displayName, numberResult.rows[0].next_number, digest],
    );
    await client.query("insert into public.room_presence (member_id) values ($1)", [inserted.rows[0].id]);
    if (previousDigest) {
      await client.query("update public.room_members set left_at = now() where credential_hash = $1 and left_at is null", [previousDigest]);
      await client.query("delete from public.room_presence where member_id in (select id from public.room_members where credential_hash = $1)", [previousDigest]);
    }
    await client.query("delete from public.room_presence where last_seen_at < now() - interval '1 day'");
    await client.query("delete from public.room_join_limits where window_started_at < now() - interval '2 hours'");
    await client.query("commit");
    return { guest: membership({ ...inserted.rows[0], code: normalizedCode }), credential, reused: false, expiresAt: room.expires_at };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function roomAccess(code: string, hostCredential: string | undefined, guestCredential: string | undefined): Promise<{ roomId: string; role: "host" | "guest"; guestId?: string }> {
  const normalizedCode = normalizeRoomCode(code);
  const roomResult = await getDb().query<{ id: string; status: string; expires_at: Date }>(
    "select id, status, expires_at from public.rooms where code = $1",
    [normalizedCode],
  );
  const room = roomResult.rows[0];
  if (!room) throw new RoomJoinError("not_found");
  if (room.status !== "open" || room.expires_at <= new Date()) throw new RoomJoinError("ended");
  const hostDigest = hostCredential ? credentialDigest(hostCredential) : null;
  if (hostDigest) {
    const host = await getDb().query(
      `select 1 from public.room_sessions where room_id = $1 and credential_hash = $2
        and role = 'host' and revoked_at is null and expires_at > now() limit 1`,
      [room.id, hostDigest],
    );
    if (host.rows[0]) return { roomId: room.id, role: "host" };
  }
  const guestDigest = guestCredential ? credentialDigest(guestCredential) : null;
  if (guestDigest) {
    const guest = await getDb().query<{ id: string }>(
      "select id from public.room_members where room_id = $1 and credential_hash = $2 and left_at is null limit 1",
      [room.id, guestDigest],
    );
    if (guest.rows[0]) return { roomId: room.id, role: "guest", guestId: guest.rows[0].id };
  }
  throw new Error("Room access denied");
}

export async function roomParticipants(roomId: string, now = new Date()): Promise<Participant[]> {
  const result = await getDb().query<{ id: string; display_name: string; name_number: number; last_seen_at: Date | null }>(
    `select m.id, m.display_name, m.name_number, p.last_seen_at
       from public.room_members m left join public.room_presence p on p.member_id = m.id
      where m.room_id = $1 and m.left_at is null order by m.joined_at, m.id`,
    [roomId],
  );
  return result.rows.map((row) => ({ id: row.id, label: displayLabel(row.display_name, row.name_number), online: isPresent(row.last_seen_at, now) }));
}

export async function touchGuestPresence(guestId: string): Promise<void> {
  await getDb().query(
    `insert into public.room_presence (member_id, last_seen_at) values ($1, now())
     on conflict (member_id) do update set last_seen_at = excluded.last_seen_at`,
    [guestId],
  );
}

export async function leaveRoom(code: string, credential: string | undefined): Promise<boolean> {
  const digest = credential ? credentialDigest(credential) : null;
  if (!digest) return false;
  const client = await getDb().connect();
  try {
    await client.query("begin");
    const result = await client.query<{ id: string }>(
      `update public.room_members m set left_at = now()
        from public.rooms r where r.id = m.room_id and r.code = $1
          and m.credential_hash = $2 and m.left_at is null returning m.id`,
      [normalizeRoomCode(code), digest],
    );
    if (result.rows[0]) await client.query("delete from public.room_presence where member_id = $1", [result.rows[0].id]);
    await client.query("commit");
    return Boolean(result.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
