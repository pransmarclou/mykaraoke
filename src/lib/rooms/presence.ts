export const PRESENCE_LEASE_MS = 30_000;

export type Participant = {
  id: string;
  label: string;
  online: boolean;
  isHost: boolean;
};

export type PresenceView = {
  participants: Participant[];
  status: "loading" | "connected" | "reconnecting" | "ended";
};

export type PresenceEvent =
  | { type: "snapshot"; participants: Participant[] }
  | { type: "interrupted" }
  | { type: "ended" };

export function presenceReducer(state: PresenceView, event: PresenceEvent): PresenceView {
  if (event.type === "snapshot") return { participants: event.participants, status: "connected" };
  if (event.type === "interrupted") return { ...state, status: "reconnecting" };
  return { participants: [], status: "ended" };
}

export function isPresent(lastSeenAt: Date | null, now: Date): boolean {
  return lastSeenAt !== null && now.getTime() - lastSeenAt.getTime() < PRESENCE_LEASE_MS;
}
