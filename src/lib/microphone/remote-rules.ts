const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type RemoteMicDescription = {
  type: "offer" | "answer";
  sdp: string;
};

export type RemoteMicCandidate = {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment: string | null;
};

export type RemoteMicSignalRequest =
  | { kind: "offer"; itemId: string; sessionId: string; description: RemoteMicDescription }
  | { kind: "answer"; itemId: string; sessionId: string; guestId: string; description: RemoteMicDescription }
  | { kind: "candidate"; itemId: string; sessionId: string; guestId?: string; candidate: RemoteMicCandidate }
  | { kind: "host-mute"; itemId: string; sessionId: string; guestId: string; muted: boolean }
  | { kind: "guest-stop"; itemId: string; sessionId: string };

export type RemoteMicSignalEvent = RemoteMicSignalRequest & {
  id: string;
  guestId: string;
  from: "host" | "guest";
  sentAt: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function uuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function description(value: unknown, expected: "offer" | "answer"): RemoteMicDescription | null {
  const candidate = record(value);
  if (!candidate || candidate.type !== expected || typeof candidate.sdp !== "string" || candidate.sdp.length < 1 || candidate.sdp.length > 65_535) return null;
  return { type: expected, sdp: candidate.sdp };
}

function iceCandidate(value: unknown): RemoteMicCandidate | null {
  const candidate = record(value);
  if (!candidate || typeof candidate.candidate !== "string" || candidate.candidate.length > 16_384) return null;
  const sdpMid = candidate.sdpMid === null || candidate.sdpMid === undefined ? null : candidate.sdpMid;
  const sdpMLineIndex = candidate.sdpMLineIndex === null || candidate.sdpMLineIndex === undefined ? null : candidate.sdpMLineIndex;
  const usernameFragment = candidate.usernameFragment === null || candidate.usernameFragment === undefined ? null : candidate.usernameFragment;
  if (typeof sdpMid !== "string" && sdpMid !== null) return null;
  if (typeof sdpMid === "string" && sdpMid.length > 256) return null;
  if (typeof sdpMLineIndex !== "number" && sdpMLineIndex !== null) return null;
  if (typeof sdpMLineIndex === "number" && (!Number.isInteger(sdpMLineIndex) || sdpMLineIndex < 0 || sdpMLineIndex > 65_535)) return null;
  if (typeof usernameFragment !== "string" && usernameFragment !== null) return null;
  if (typeof usernameFragment === "string" && usernameFragment.length > 256) return null;
  return { candidate: candidate.candidate, sdpMid, sdpMLineIndex, usernameFragment };
}

export function parseRemoteMicSignalRequest(value: unknown): RemoteMicSignalRequest | null {
  const signal = record(value);
  if (!signal || !uuid(signal.itemId) || !uuid(signal.sessionId)) return null;
  if (signal.kind === "offer") {
    const parsed = description(signal.description, "offer");
    return parsed ? { kind: "offer", itemId: signal.itemId, sessionId: signal.sessionId, description: parsed } : null;
  }
  if (signal.kind === "answer" && uuid(signal.guestId)) {
    const parsed = description(signal.description, "answer");
    return parsed ? { kind: "answer", itemId: signal.itemId, sessionId: signal.sessionId, guestId: signal.guestId, description: parsed } : null;
  }
  if (signal.kind === "candidate") {
    const parsed = iceCandidate(signal.candidate);
    if (!parsed || (signal.guestId !== undefined && !uuid(signal.guestId))) return null;
    return { kind: "candidate", itemId: signal.itemId, sessionId: signal.sessionId, ...(signal.guestId ? { guestId: signal.guestId } : {}), candidate: parsed };
  }
  if (signal.kind === "host-mute" && uuid(signal.guestId) && typeof signal.muted === "boolean") {
    return { kind: "host-mute", itemId: signal.itemId, sessionId: signal.sessionId, guestId: signal.guestId, muted: signal.muted };
  }
  if (signal.kind === "guest-stop") return { kind: "guest-stop", itemId: signal.itemId, sessionId: signal.sessionId };
  return null;
}

export function parseRemoteMicSignalEvent(value: unknown): RemoteMicSignalEvent | null {
  const event = record(value);
  if (!event || !uuid(event.id) || !uuid(event.guestId) || (event.from !== "host" && event.from !== "guest") || typeof event.sentAt !== "string" || Number.isNaN(Date.parse(event.sentAt))) return null;
  const parsed = parseRemoteMicSignalRequest(event);
  if (!parsed) return null;
  return { ...parsed, id: event.id, guestId: event.guestId, from: event.from, sentAt: event.sentAt };
}

export function guestOwnsCurrentMicrophone(requestedBy: string | null | undefined, guestId: string | undefined): boolean {
  return Boolean(guestId && requestedBy === guestId);
}
