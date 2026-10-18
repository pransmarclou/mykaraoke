import { NextResponse } from "next/server";
import { RoomJoinError } from "@/lib/rooms/guests";

export function roomApiError(error: unknown, context: string): NextResponse {
  if (error instanceof RoomJoinError) {
    const messages = {
      not_found: [404, "No room has that code. Check it and try again."],
      ended: [410, "This room has ended or expired. Ask the host for a new code."],
      full: [409, "This room is full. Ask the host for help."],
    } as const;
    const [status, message] = messages[error.reason];
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
  if (error instanceof Error && error.message === "Room access denied") {
    return NextResponse.json({ error: "Join this room to see its participants." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  console.error(context, { name: error instanceof Error ? error.name : "Unknown", code: (error as { code?: string })?.code });
  return NextResponse.json({ error: "The room is unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
