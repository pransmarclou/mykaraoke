import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHostRoom, getActiveHostRoom } from "@/lib/rooms/repository";
import { configuredAppOrigin, hasSameOrigin, HOST_COOKIE_NAME } from "@/lib/rooms/http";
import { roomCreationIdentity, reserveRoomCreationSlot, RoomCreationRateLimitError } from "@/lib/rooms/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!hasSameOrigin(request)) {
      return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    }

    const cookieStore = await cookies();
    const existing = await getActiveHostRoom(cookieStore.get(HOST_COOKIE_NAME)?.value);
    if (existing) {
      return NextResponse.json({ code: existing.code }, { headers: { "Cache-Control": "no-store" } });
    }

    const identity = roomCreationIdentity(request);
    await reserveRoomCreationSlot(identity.key, identity.limit);
    const { room, credential } = await createHostRoom();
    const response = NextResponse.json({ code: room.code }, { status: 201, headers: { "Cache-Control": "no-store" } });
    response.cookies.set(HOST_COOKIE_NAME, credential, {
      httpOnly: true,
      sameSite: "lax",
      secure: configuredAppOrigin().startsWith("https:"),
      path: "/",
      maxAge: Math.floor((room.expiresAt.getTime() - Date.now()) / 1000),
    });
    return response;
  } catch (error) {
    if (error instanceof RoomCreationRateLimitError) {
      return NextResponse.json({ error: "Too many rooms were created recently. Try again later." }, { status: 429 });
    }
    console.error("Room creation failed", { name: error instanceof Error ? error.name : "Unknown", code: (error as { code?: string })?.code });
    return NextResponse.json({ error: "Room creation is unavailable. Please try again." }, { status: 503 });
  }
}
