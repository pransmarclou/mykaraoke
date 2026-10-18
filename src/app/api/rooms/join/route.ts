import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { InvalidDisplayNameError, normalizeDisplayName } from "@/lib/rooms/display-name";
import { roomApiError } from "@/lib/rooms/api-errors";
import { getActiveGuest, joinRoom } from "@/lib/rooms/guests";
import { configuredAppOrigin, GUEST_COOKIE_NAME, hasSameOrigin } from "@/lib/rooms/http";
import { reserveRoomJoinSlot, roomCreationIdentity, RoomJoinRateLimitError } from "@/lib/rooms/rate-limit";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/room-code";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 1024) return NextResponse.json({ error: "Join request is too large." }, { status: 413 });
    let body: { code?: unknown; displayName?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Enter a room code and display name." }, { status: 400 });
    }
    if (!body || typeof body.code !== "string" || !isValidRoomCode(body.code)) {
      return NextResponse.json({ error: "Enter a valid six-character room code." }, { status: 400 });
    }
    const code = normalizeRoomCode(body.code);
    const displayName = normalizeDisplayName(body.displayName);
    const cookieStore = await cookies();
    const priorCredential = cookieStore.get(GUEST_COOKIE_NAME)?.value;
    const existing = await getActiveGuest(code, priorCredential);
    if (!existing) {
      const identity = roomCreationIdentity(request);
      await reserveRoomJoinSlot(identity.key, identity.limit * 3);
    }
    const joined = await joinRoom(code, displayName, priorCredential);
    const response = NextResponse.json({ code, label: joined.guest.label, reused: joined.reused }, { status: joined.reused ? 200 : 201, headers: { "Cache-Control": "no-store" } });
    response.cookies.set(GUEST_COOKIE_NAME, joined.credential, {
      httpOnly: true,
      sameSite: "lax",
      secure: configuredAppOrigin().startsWith("https:"),
      path: "/",
      maxAge: Math.max(1, Math.floor((joined.expiresAt.getTime() - Date.now()) / 1000)),
    });
    return response;
  } catch (error) {
    if (error instanceof InvalidDisplayNameError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof RoomJoinRateLimitError) return NextResponse.json({ error: "Too many join attempts. Try again later." }, { status: 429 });
    return roomApiError(error, "Room join failed");
  }
}
