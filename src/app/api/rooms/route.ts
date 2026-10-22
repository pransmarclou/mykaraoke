import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { provisionTv } from "@/lib/playback/state";
import { createHostRoom, getActiveHostRoom } from "@/lib/rooms/repository";
import { configuredAppOrigin, hasSameOrigin, HOST_COOKIE_NAME, TV_COOKIE_NAME } from "@/lib/rooms/http";
import { roomCreationIdentity, reserveRoomCreationSlot, RoomCreationRateLimitError } from "@/lib/rooms/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) {
      return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    }

    if (Number(request.headers.get("content-length") ?? 0) > 1_024) {
      return NextResponse.json({ error: "Room request is too large." }, { status: 413 });
    }
    const body = await request.json().catch(() => ({})) as { display?: unknown };
    if (body.display !== undefined && body.display !== "host" && body.display !== "tv") {
      return NextResponse.json({ error: "Invalid room display." }, { status: 400 });
    }
    const directToTv = body.display === "tv";
    const cookieStore = await cookies();
    const existing = await getActiveHostRoom(cookieStore.get(HOST_COOKIE_NAME)?.value);
    if (existing) {
      const response = NextResponse.json({ code: existing.code }, { headers: { "Cache-Control": "no-store" } });
      if (directToTv) {
        const tv = await provisionTv(existing.id);
        response.cookies.set(TV_COOKIE_NAME, tv.credential, roomCookieOptions(tv.expiresAt));
      }
      return response;
    }

    const identity = roomCreationIdentity(request);
    await reserveRoomCreationSlot(identity.key, identity.limit);
    const { room, credential } = await createHostRoom();
    const response = NextResponse.json({ code: room.code }, { status: 201, headers: { "Cache-Control": "no-store" } });
    response.cookies.set(HOST_COOKIE_NAME, credential, roomCookieOptions(room.expiresAt));
    if (directToTv) {
      const tv = await provisionTv(room.id);
      response.cookies.set(TV_COOKIE_NAME, tv.credential, roomCookieOptions(tv.expiresAt));
    }
    return response;
  } catch (error) {
    if (error instanceof RoomCreationRateLimitError) {
      return NextResponse.json({ error: "Too many rooms were created recently. Try again later." }, { status: 429 });
    }
    console.error("Room creation failed", { name: error instanceof Error ? error.name : "Unknown", code: (error as { code?: string })?.code });
    return NextResponse.json({ error: "Room creation is unavailable. Please try again." }, { status: 503 });
  }
}

function roomCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: configuredAppOrigin().startsWith("https:"),
    path: "/",
    maxAge: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  };
}
