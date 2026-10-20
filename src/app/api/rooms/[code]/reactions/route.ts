import { NextResponse } from "next/server";
import { reactionApiError } from "@/lib/reactions/api";
import { isRoomReactionId } from "@/lib/reactions/rules";
import { sendRoomReaction } from "@/lib/reactions/state";
import { hasSameOrigin } from "@/lib/rooms/http";
import { songRoomAccess } from "@/lib/songs/api";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 512) return NextResponse.json({ error: "Reaction request is too large." }, { status: 413 });
    const { code } = await params;
    const access = await songRoomAccess(code);
    const body = await request.json().catch(() => null) as { reaction?: unknown } | null;
    if (!body || !isRoomReactionId(body.reaction)) return NextResponse.json({ error: "Choose one of the available reactions." }, { status: 400 });
    const event = await sendRoomReaction({ roomId: access.roomId, role: access.role, guestId: access.guestId, reaction: body.reaction });
    return NextResponse.json(event, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return reactionApiError(error, "Reaction failed");
  }
}
