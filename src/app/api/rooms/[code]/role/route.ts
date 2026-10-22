import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { roomApiError } from "@/lib/rooms/api-errors";
import { roomAccess } from "@/lib/rooms/guests";
import { GUEST_COOKIE_NAME, HOST_COOKIE_NAME } from "@/lib/rooms/http";
import { isValidRoomCode } from "@/lib/rooms/room-code";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!isValidRoomCode(code)) return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
    const cookieStore = await cookies();
    const access = await roomAccess(code, cookieStore.get(HOST_COOKIE_NAME)?.value, cookieStore.get(GUEST_COOKIE_NAME)?.value);
    return NextResponse.json({ role: access.role, memberId: access.guestId ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return roomApiError(error, "Room role lookup failed");
  }
}
