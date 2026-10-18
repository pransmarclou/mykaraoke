import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasSameOrigin, TV_COOKIE_NAME } from "@/lib/rooms/http";
import { isValidRoomCode } from "@/lib/rooms/room-code";
import { playbackApiError } from "@/lib/playback/api";
import { PlaybackError, tvPlayerEvent, tvRoomAccess, type TvPlayerEvent } from "@/lib/playback/state";

export const runtime = "nodejs";
const events = new Set<TvPlayerEvent>(["playing", "paused", "blocked", "error", "ended"]);
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 1_024) return NextResponse.json({ error: "Player event is too large." }, { status: 413 });
    const { code } = await params;
    if (!isValidRoomCode(code)) throw new PlaybackError("invalid");
    const credential = (await cookies()).get(TV_COOKIE_NAME)?.value;
    const roomId = await tvRoomAccess(code, credential);
    if (!roomId || !credential) throw new PlaybackError("forbidden");
    const body = await request.json().catch(() => null) as { itemId?: string; event?: TvPlayerEvent; errorCode?: number } | null;
    if (!body?.itemId || !body.event || !events.has(body.event)) throw new PlaybackError("invalid");
    return NextResponse.json(await tvPlayerEvent(roomId, credential, body.itemId, body.event, body.errorCode), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return playbackApiError(error, "TV player event failed"); }
}
