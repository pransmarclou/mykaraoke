import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getDb } from "@/lib/db";
import { configuredAppOrigin } from "@/lib/rooms/http";

const WINDOW_MS = 60 * 60 * 1000;

export class RoomCreationRateLimitError extends Error {
  constructor() {
    super("Room creation limit reached");
  }
}

export class RoomJoinRateLimitError extends Error {
  constructor() {
    super("Room join limit reached");
  }
}

export function roomCreationIdentity(request: Request): { key: Buffer; limit: number } {
  const hostname = new URL(configuredAppOrigin()).hostname;
  if (["localhost", "127.0.0.1"].includes(hostname)) {
    return { key: createHmac("sha256", "mykaraoke-local-development").update("loopback").digest(), limit: 100 };
  }

  const headerName = process.env.ROOM_CLIENT_IP_HEADER;
  const secret = process.env.ROOM_RATE_LIMIT_SECRET;
  if (!headerName || !secret || secret.length < 32) {
    throw new Error("Trusted client IP header and rate-limit secret are required outside localhost");
  }
  const address = request.headers.get(headerName)?.split(",")[0]?.trim();
  if (!address || !isIP(address)) throw new Error("Trusted client IP header is missing or invalid");
  return { key: createHmac("sha256", secret).update(address).digest(), limit: 20 };
}

export async function reserveRoomCreationSlot(key: Buffer, limit: number, now = new Date()): Promise<void> {
  const result = await getDb().query<{ created_count: number }>(
    `insert into public.room_creation_limits (client_key, window_started_at, created_count)
     values ($1, $2, 1)
     on conflict (client_key) do update set
       window_started_at = case when room_creation_limits.window_started_at <= $2::timestamptz - $3::bigint * interval '1 millisecond' then $2 else room_creation_limits.window_started_at end,
       created_count = case when room_creation_limits.window_started_at <= $2::timestamptz - $3::bigint * interval '1 millisecond' then 1 else least(room_creation_limits.created_count + 1, $4::integer + 1) end
     returning created_count`,
    [key, now, WINDOW_MS, limit],
  );
  if (result.rows[0].created_count > limit) throw new RoomCreationRateLimitError();
}

export async function reserveRoomJoinSlot(key: Buffer, limit: number, now = new Date()): Promise<void> {
  const result = await getDb().query<{ joined_count: number }>(
    `insert into public.room_join_limits (client_key, window_started_at, joined_count)
     values ($1, $2, 1)
     on conflict (client_key) do update set
       window_started_at = case when room_join_limits.window_started_at <= $2::timestamptz - $3::bigint * interval '1 millisecond' then $2 else room_join_limits.window_started_at end,
       joined_count = case when room_join_limits.window_started_at <= $2::timestamptz - $3::bigint * interval '1 millisecond' then 1 else least(room_join_limits.joined_count + 1, $4::integer + 1) end
     returning joined_count`,
    [key, now, WINDOW_MS, limit],
  );
  if (result.rows[0].joined_count > limit) throw new RoomJoinRateLimitError();
}
