import type { PoolClient } from "pg";
import { getDb } from "@/lib/db";
import type { RemoteMicSignalEvent, RemoteMicSignalRequest } from "@/lib/microphone/remote-rules";
import { configuredRemoteMicTopic } from "@/lib/microphone/remote-topic";
import { QueueError, reserveQueueMutation } from "@/lib/songs/queue";

export class RemoteMicError extends Error {
  constructor(public readonly reason: "invalid" | "forbidden" | "ended" | "stale" | "limited" | "unconfigured") {
    super(reason);
  }
}

type MicRoomRow = {
  queue_topic: string;
  current_item_id: string | null;
  requested_by: string | null;
};

async function currentMicrophoneOwner(client: PoolClient, roomId: string): Promise<MicRoomRow> {
  const result = await client.query<MicRoomRow>(
    `select r.queue_topic, p.current_item_id, q.requested_by
       from public.rooms r
       left join public.playback_state p on p.room_id = r.id
       left join public.queue_items q on q.id = p.current_item_id
      where r.id = $1 and r.status = 'open' and r.expires_at > now()
      for update of r`,
    [roomId],
  );
  if (!result.rows[0]) throw new RemoteMicError("ended");
  return result.rows[0];
}

export async function sendRemoteMicSignal(input: {
  roomId: string;
  role: "host" | "guest";
  guestId?: string;
  signal: RemoteMicSignalRequest;
}): Promise<RemoteMicSignalEvent> {
  const client = await getDb().connect();
  try {
    await client.query("begin");
    const room = await currentMicrophoneOwner(client, input.roomId);
    if (!room.current_item_id || room.current_item_id !== input.signal.itemId || !room.requested_by) throw new RemoteMicError("stale");

    if (input.role === "guest") {
      if (!input.guestId || input.guestId !== room.requested_by) throw new RemoteMicError("forbidden");
      if (!["offer", "candidate", "guest-stop"].includes(input.signal.kind) || ("guestId" in input.signal && input.signal.guestId !== undefined)) throw new RemoteMicError("invalid");
    } else {
      if (!["answer", "candidate", "host-mute"].includes(input.signal.kind) || !("guestId" in input.signal) || input.signal.guestId !== room.requested_by) throw new RemoteMicError("forbidden");
    }

    const guestId = room.requested_by;
    const topic = configuredRemoteMicTopic(room.queue_topic, room.current_item_id, guestId);
    if (!topic) throw new RemoteMicError("unconfigured");
    const actorKey = input.role === "host" ? `remote-mic:host:${guestId}` : `remote-mic:guest:${guestId}`;
    await reserveQueueMutation(client, input.roomId, actorKey, 180).catch((error: unknown) => {
      throw error instanceof QueueError && error.reason === "limited" ? new RemoteMicError("limited") : error;
    });

    const event: RemoteMicSignalEvent = {
      ...input.signal,
      id: crypto.randomUUID(),
      guestId,
      from: input.role,
      sentAt: new Date().toISOString(),
    };
    await client.query(
      "select realtime.send($1::jsonb, 'microphone_signal', $2, true)",
      [JSON.stringify(event), topic],
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
