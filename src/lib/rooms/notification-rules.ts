export type MemberJoinedNotification = {
  id: string;
  kind: "member_joined";
  actorId: string;
  actorName: string;
  occurredAt: string;
};

export type SongAddedNotification = {
  id: string;
  kind: "song_added";
  actorId: string | null;
  actorName: string;
  songTitle: string;
  autoStarted: boolean;
  occurredAt: string;
};

export type PartyNotification = MemberJoinedNotification | SongAddedNotification;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function parsePartyNotification(value: unknown): PartyNotification | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const event = value as Record<string, unknown>;
  if (
    typeof event.id !== "string" || !UUID.test(event.id) ||
    typeof event.actorName !== "string" || event.actorName.length < 1 || event.actorName.length > 80 ||
    typeof event.occurredAt !== "string" || Number.isNaN(Date.parse(event.occurredAt))
  ) return null;

  if (event.kind === "member_joined" && typeof event.actorId === "string" && UUID.test(event.actorId)) {
    return { id: event.id, kind: event.kind, actorId: event.actorId, actorName: event.actorName, occurredAt: event.occurredAt };
  }
  if (
    event.kind === "song_added" &&
    (event.actorId === null || (typeof event.actorId === "string" && UUID.test(event.actorId))) &&
    typeof event.songTitle === "string" && event.songTitle.length > 0 && event.songTitle.length <= 300 &&
    typeof event.autoStarted === "boolean"
  ) {
    return {
      id: event.id,
      kind: event.kind,
      actorId: event.actorId,
      actorName: event.actorName,
      songTitle: event.songTitle,
      autoStarted: event.autoStarted,
      occurredAt: event.occurredAt,
    };
  }
  return null;
}

export function partyNotificationMessage(event: PartyNotification): string {
  if (event.kind === "member_joined") return `${event.actorName} joined the room.`;
  return event.autoStarted
    ? `${event.actorName} added ${event.songTitle}. It is starting now.`
    : `${event.actorName} added ${event.songTitle} to the queue.`;
}
