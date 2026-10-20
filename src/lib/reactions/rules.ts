export const ROOM_REACTIONS = [
  { id: "applause", emoji: "👏", label: "Applause" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "heart", emoji: "❤️", label: "Love" },
  { id: "party", emoji: "🎉", label: "Celebrate" },
] as const;

export type RoomReactionId = (typeof ROOM_REACTIONS)[number]["id"];

const reactionIds = new Set<string>(ROOM_REACTIONS.map((reaction) => reaction.id));

export function isRoomReactionId(value: unknown): value is RoomReactionId {
  return typeof value === "string" && reactionIds.has(value);
}
export type RoomReactionEvent = {
  id: string;
  reaction: RoomReactionId;
  sender: string;
  sentAt: string;
};

export function parseRoomReactionEvent(value: unknown): RoomReactionEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const event = value as Record<string, unknown>;
  if (
    typeof event.id !== "string" || event.id.length < 1 || event.id.length > 100 ||
    !isRoomReactionId(event.reaction) ||
    typeof event.sender !== "string" || event.sender.length < 1 || event.sender.length > 80 ||
    typeof event.sentAt !== "string" || Number.isNaN(Date.parse(event.sentAt))
  ) return null;
  return { id: event.id, reaction: event.reaction, sender: event.sender, sentAt: event.sentAt };
}

export function reactionEmoji(id: RoomReactionId): string {
  return ROOM_REACTIONS.find((reaction) => reaction.id === id)?.emoji ?? "🎉";
}
