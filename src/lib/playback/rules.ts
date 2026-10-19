export type PlayerEvent = "playing" | "paused" | "blocked" | "error" | "ended";
export type ObservedPlayerState = "idle" | "cued" | "playing" | "paused" | "blocked" | "error";

export function commandReplayDecision(
  previousAction: string | undefined,
  requestedAction: string,
): "execute" | "replay" | "reject" {
  if (previousAction === undefined) return "execute";
  return previousAction === requestedAction ? "replay" : "reject";
}

export function playerEventTransition(
  currentItemId: string | null,
  eventItemId: string,
  observed: ObservedPlayerState,
  event: PlayerEvent,
  previousErrorCode: number | null,
  errorCode?: number,
): "ignore" | "advance" | "update" {
  if (currentItemId !== eventItemId) return "ignore";
  if (event === "ended") return "advance";
  if (observed !== event) return "update";
  return event === "error" && previousErrorCode !== (Number.isInteger(errorCode) ? errorCode! : null)
    ? "update"
    : "ignore";
}
