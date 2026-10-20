import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { InvalidDisplayNameError } from "@/lib/rooms/display-name";
import { roomAccess } from "@/lib/rooms/guests";
import { GUEST_COOKIE_NAME, HOST_COOKIE_NAME } from "@/lib/rooms/http";
import { isValidRoomCode } from "@/lib/rooms/room-code";
import { QueueError } from "@/lib/songs/queue";
import { SingerAssignmentError } from "@/lib/songs/singers";
import { SongSearchError } from "@/lib/songs/youtube";
import { roomApiError } from "@/lib/rooms/api-errors";

export async function songRoomAccess(code: string) {
  if (!isValidRoomCode(code)) throw new QueueError("invalid");
  const cookieStore = await cookies();
  return roomAccess(code, cookieStore.get(HOST_COOKIE_NAME)?.value, cookieStore.get(GUEST_COOKIE_NAME)?.value);
}

export function songApiError(error: unknown, context: string) {
  if (error instanceof InvalidDisplayNameError) {
    return NextResponse.json(
      { error: error.message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof SingerAssignmentError) {
    return NextResponse.json(
      { error: "Choose two different people for a duet." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof SongSearchError) {
    const responses = {
      invalid: [400, "Search for 2–80 characters."],
      unconfigured: [503, "YouTube search is not configured yet. Ask the room owner to add a server API key."],
      quota: [429, "YouTube search has reached its daily quota. Try again tomorrow."],
      unavailable: [503, "YouTube search is unavailable. Please try again."],
      limited: [429, "You have searched too often today. Try again tomorrow."],
    } as const;
    const [status, message] = responses[error.reason];
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
  if (error instanceof QueueError) {
    const responses = {
      invalid: [400, "This song or queue request is invalid. Search again and retry."],
      stale: [409, "The queue changed on another device. Review the latest order and retry."],
      duplicate: [409, "You already have that song in the queue."],
      limit: [409, "You can have up to three songs queued. Wait for the host to move one on."],
      limited: [429, "Too many queue changes. Wait a minute and try again."],
      missing: [404, "That queued song is no longer available."],
      ended: [410, "This room has ended or expired."],
      forbidden: [403, "The host has not allowed guests to do that."],
    } as const;
    const [status, message] = responses[error.reason];
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
  return roomApiError(error, context);
}
