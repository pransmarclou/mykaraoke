import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { closeHostRoom } from "@/lib/rooms/repository";
import { hasSameOrigin, HOST_COOKIE_NAME } from "@/lib/rooms/http";
import { isValidRoomCode } from "@/lib/rooms/room-code";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) {
      return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    }
    const { code } = await params;
    if (!isValidRoomCode(code)) {
      return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
    }
    const cookieStore = await cookies();
    const closed = await closeHostRoom(code, cookieStore.get(HOST_COOKIE_NAME)?.value);
    if (!closed) {
      return NextResponse.json({ error: "Host access is required." }, { status: 403 });
    }
    const response = NextResponse.json({ closed: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.delete(HOST_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("Room close failed", { name: error instanceof Error ? error.name : "Unknown", code: (error as { code?: string })?.code });
    return NextResponse.json({ error: "The room could not be closed. Please try again." }, { status: 503 });
  }
}
