import { NextResponse } from "next/server";
import { configuredAppOrigin, hasSameOrigin, TV_COOKIE_NAME } from "@/lib/rooms/http";
import { playbackApiError } from "@/lib/playback/api";
import { PlaybackError, pairTv } from "@/lib/playback/state";
import { isValidRoomCode } from "@/lib/rooms/room-code";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 1_024) return NextResponse.json({ error: "Pairing request is too large." }, { status: 413 });
    const { code } = await params;
    if (!isValidRoomCode(code)) throw new PlaybackError("invalid");
    const body = await request.json().catch(() => null) as { pairCode?: unknown } | null;
    if (typeof body?.pairCode !== "string") throw new PlaybackError("pair_invalid");
    const paired = await pairTv(code, body.pairCode.trim().toUpperCase());
    const response = NextResponse.json({ paired: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(TV_COOKIE_NAME, paired.credential, {
      httpOnly: true, sameSite: "lax", secure: configuredAppOrigin().startsWith("https:"), path: "/",
      maxAge: Math.max(1, Math.floor((paired.expiresAt.getTime() - Date.now()) / 1000)),
    });
    return response;
  } catch (error) { return playbackApiError(error, "TV pairing failed"); }
}
