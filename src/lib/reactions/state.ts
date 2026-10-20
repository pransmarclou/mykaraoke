import type { PoolClient } from "pg";
import { getDb } from "@/lib/db";
import { displayLabel } from "@/lib/rooms/display-name";
import type { RoomReactionEvent, RoomReactionId } from "@/lib/reactions/rules";
import { readGuestPermissions } from "@/lib/permissions/state";

export class ReactionError extends Error {
  constructor(public readonly reason: "invalid" | "ended" | "empty" | "limited" | "forbidden") {
    super(reason);
  }
}
export const REACTION_WINDOW_SECONDS = 10;
export const REACTION_WINDOW_LIMIT = 6;

export async function reserveReaction(
  client: PoolClient,
  roomId: string,
  actorKey: string,
  limit = REACTION_WINDOW_LIMIT,
  now = new Date(),
): Promise<void> {
  const result = await client.query<{ reactions: number }>(
    `insert into public.reaction_limits (room_id, actor_key, window_started_at, reactions)
     values ($1, $2, $3, 1)
     on conflict (room_id, actor_key) do update set
       window_started_at = case
         when reaction_limits.window_started_at <= $3::timestamptz - make_interval(secs => $4)
           then $3::timestamptz
         else reaction_limits.window_started_at
       end,
       reactions = case
         when reaction_limits.window_started_at <= $3::timestamptz - make_interval(secs => $4)
           then 1
         else reaction_limits.reactions + 1
       end
     returning reactions`,
    [roomId, actorKey, now, REACTION_WINDOW_SECONDS],
  );
  if (result.rows[0].reactions > limit) throw new ReactionError("limited");
}

export async function sendRoomReaction(input: {
  roomId: string;
  role: "host" | "guest";
  guestId?: string;
  reaction: RoomReactionId;
}): Promise<RoomReactionEvent> {
  const client = await getDb().connect();
  try {
    await client.query("begin");
    const roomResult = await client.query<{ queue_topic: string; current_item_id: string | null }>(
      `select r.queue_topic, p.current_item_id
         from public.rooms r
         left join public.playback_state p on p.room_id = r.id
        where r.id = $1 and r.status = 'open' and r.expires_at > now()
        for update of r`,
      [input.roomId],
    );
    const room = roomResult.rows[0];
    if (!room) throw new ReactionError("ended");
    if (input.role === "guest" && !(await readGuestPermissions(client, input.roomId)).reactions) throw new ReactionError("forbidden");
    if (!room.current_item_id) throw new ReactionError("empty");

    let sender = "Host";
    let actorKey = "host";
    if (input.role === "guest") {
      if (!input.guestId) throw new ReactionError("invalid");
      const guest = await client.query<{ display_name: string; name_number: number }>(
        `select display_name, name_number from public.room_members
          where id = $1 and room_id = $2 and left_at is null limit 1`,
        [input.guestId, input.roomId],
      );
      if (!guest.rows[0]) throw new ReactionError("ended");
      sender = displayLabel(guest.rows[0].display_name, guest.rows[0].name_number);
      actorKey = `guest:${input.guestId}`;
    }

    await reserveReaction(client, input.roomId, actorKey);
    const event: RoomReactionEvent = {
      id: crypto.randomUUID(),
      reaction: input.reaction,
      sender,
      sentAt: new Date().toISOString(),
    };
    await client.query(
      "select realtime.send($1::jsonb, 'reaction', $2, true)",
      [JSON.stringify(event), `queue:${room.queue_topic}`],
    );
    await client.query("commit");
    return event;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
