import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { roomApiError } from "@/lib/rooms/api-errors";
import { roomAccess, roomParticipants, touchGuestPresence } from "@/lib/rooms/guests";
import { GUEST_COOKIE_NAME, hasSameOrigin, HOST_COOKIE_NAME } from "@/lib/rooms/http";
import { isValidRoomCode } from "@/lib/rooms/room-code";

export const runtime = "nodejs";

async function access(code: string, guestOnly = false) {
  const cookieStore = await cookies();
  return roomAccess(code, guestOnly ? undefined : cookieStore.get(HOST_COOKIE_NAME)?.value, cookieStore.get(GUEST_COOKIE_NAME)?.value);
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!isValidRoomCode(code)) return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
    const room = await access(code);
    const participants = await roomParticipants(room.roomId);
    return NextResponse.json({ participants, expiresAt: room.expiresAt.toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return roomApiError(error, "Participant list failed");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    const { code } = await params;
    if (!isValidRoomCode(code)) return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
    const room = await access(code, true);
    if (room.role !== "guest" || !room.guestId) return NextResponse.json({ error: "Guest access is required." }, { status: 403 });
    await touchGuestPresence(room.guestId);
    const participants = await roomParticipants(room.roomId);
    return NextResponse.json({ participants, expiresAt: room.expiresAt.toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return roomApiError(error, "Presence update failed");
  }
}
