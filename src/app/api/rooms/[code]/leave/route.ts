import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { roomApiError } from "@/lib/rooms/api-errors";
import { leaveRoom } from "@/lib/rooms/guests";
import { GUEST_COOKIE_NAME, hasSameOrigin } from "@/lib/rooms/http";
import { isValidRoomCode } from "@/lib/rooms/room-code";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    const { code } = await params;
    if (!isValidRoomCode(code)) return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
    const cookieStore = await cookies();
    const left = await leaveRoom(code, cookieStore.get(GUEST_COOKIE_NAME)?.value);
    if (!left) return NextResponse.json({ error: "Guest access is required." }, { status: 403 });
    const response = NextResponse.json({ left: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.delete(GUEST_COOKIE_NAME);
    return response;
  } catch (error) {
    return roomApiError(error, "Room leave failed");
  }
}
