import type { PoolClient } from "pg";
import { getDb } from "@/lib/db";
import {
  DEFAULT_PARTY_THEME,
  isPartyThemeId,
  type PartyThemeId,
} from "@/lib/themes/rules";

export class PartyThemeError extends Error {
  constructor(public readonly reason: "invalid" | "ended") {
    super(reason);
  }
}

export async function readRoomPartyTheme(
  client: PoolClient,
  roomId: string,
): Promise<PartyThemeId> {
  const result = await client.query<{ party_theme: string }>(
    "select party_theme from public.room_settings where room_id = $1",
    [roomId],
  );
  return isPartyThemeId(result.rows[0]?.party_theme)
    ? result.rows[0].party_theme
    : DEFAULT_PARTY_THEME;
}

export async function updateRoomPartyTheme(
  roomId: string,
  themeId: unknown,
): Promise<{ partyTheme: PartyThemeId; version: number }> {
  if (!isPartyThemeId(themeId)) throw new PartyThemeError("invalid");
  const client = await getDb().connect();
  try {
    await client.query("begin");
    const room = await client.query<{ status: string; expires_at: Date }>(
      "select status, expires_at from public.rooms where id = $1 for update",
      [roomId],
    );
    if (
      !room.rows[0] ||
      room.rows[0].status !== "open" ||
      room.rows[0].expires_at <= new Date()
    ) {
      throw new PartyThemeError("ended");
    }
    await client.query(
      "update public.room_settings set party_theme = $2 where room_id = $1",
      [roomId, themeId],
    );
    const changed = await client.query<{
      queue_version: string;
      queue_topic: string;
    }>(
      "update public.rooms set queue_version = queue_version + 1 where id = $1 returning queue_version, queue_topic",
      [roomId],
    );
    await client.query(
      "select realtime.send(jsonb_build_object('version', $1::bigint), 'queue_changed', $2, true)",
      [
        changed.rows[0].queue_version,
        `queue:${changed.rows[0].queue_topic}`,
      ],
    );
    await client.query("commit");
    return {
      partyTheme: themeId,
      version: Number(changed.rows[0].queue_version),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
