import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { roomApiError } from "@/lib/rooms/api-errors";
import { TV_COOKIE_NAME } from "@/lib/rooms/http";
import { isValidRoomCode } from "@/lib/rooms/room-code";
import { songRoomAccess } from "@/lib/songs/api";
import { PlaybackError, touchTv, tvRoomAccess } from "@/lib/playback/state";

export async function playbackReader(code: string): Promise<{ roomId: string; role: "host" | "guest" | "tv" }> {
  if (!isValidRoomCode(code)) throw new PlaybackError("invalid");
  const cookieStore = await cookies();
  const credential = cookieStore.get(TV_COOKIE_NAME)?.value;
  const tvRoomId = await tvRoomAccess(code, credential);
  if (tvRoomId) {
    if (credential) await touchTv(tvRoomId, credential);
    return { roomId: tvRoomId, role: "tv" };
  }
  const access = await songRoomAccess(code);
  return { roomId: access.roomId, role: access.role };
}

export function playbackApiError(error: unknown, context: string): NextResponse {
  if (error instanceof PlaybackError) {
    const responses = {
      invalid: [400, "Invalid playback request."],
      forbidden: [403, "This display is not paired with the room."],
      not_allowed: [403, "The host has not turned on remote control for guests."],
      limited: [429, "Too many remote commands. Wait a minute and try again."],
      ended: [410, "This room has ended or expired."],
      empty: [409, "No song is ready for this action."],
      no_device: [409, "Pair a TV display before starting playback."],
      current: [409, "A song is already current. Skip it before starting another."],
      pair_invalid: [403, "Pairing code is invalid or expired. Ask the host for a new code."],
      pair_limited: [429, "Too many pairing attempts. Try again later."],
    } as const;
    const [status, message] = responses[error.reason];
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
  return roomApiError(error, context);
}
