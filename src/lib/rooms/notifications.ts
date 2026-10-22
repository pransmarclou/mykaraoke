import type { PoolClient } from "pg";
import type { PartyNotification } from "@/lib/rooms/notification-rules";

export async function publishPartyNotification(client: PoolClient, queueTopic: string, event: PartyNotification): Promise<void> {
  await client.query(
    "select realtime.send($1::jsonb, 'party_notification', $2, true)",
    [JSON.stringify(event), `queue:${queueTopic}`],
  );
}
