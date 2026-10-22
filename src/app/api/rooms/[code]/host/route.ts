import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { roomApiError } from "@/lib/rooms/api-errors";
import { roomAccess, roomParticipants, RoomHostError, transferRoomHost } from "@/lib/rooms/guests";
import { GUEST_COOKIE_NAME, hasSameOrigin, HOST_COOKIE_NAME } from "@/lib/rooms/http";
import { isValidRoomCode } from "@/lib/rooms/room-code";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 1_024) return NextResponse.json({ error: "Host transfer request is too large." }, { status: 413 });
    const { code } = await params;
    if (!isValidRoomCode(code)) return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
    const cookieStore = await cookies();
    const access = await roomAccess(code, cookieStore.get(HOST_COOKIE_NAME)?.value, cookieStore.get(GUEST_COOKIE_NAME)?.value);
    if (access.role !== "host") return NextResponse.json({ error: "Only the current host can transfer host controls." }, { status: 403 });
    const body = await request.json().catch(() => null) as { targetMemberId?: unknown } | null;
    if (typeof body?.targetMemberId !== "string") return NextResponse.json({ error: "Choose an active participant." }, { status: 400 });
    await transferRoomHost(access.roomId, access.guestId, body.targetMemberId);
    return NextResponse.json({ participants: await roomParticipants(access.roomId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RoomHostError) {
      const status = error.reason === "forbidden" ? 403 : error.reason === "missing" ? 404 : 400;
      const message = error.reason === "forbidden" ? "Only the current host can transfer host controls." : error.reason === "missing" ? "That participant is no longer in the room." : "Choose a valid participant.";
      return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
    }
    return roomApiError(error, "Host transfer failed");
  }
}
