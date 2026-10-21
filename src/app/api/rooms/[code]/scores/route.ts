import { NextResponse } from "next/server";
import { playbackApiError, playbackReader } from "@/lib/playback/api";
import { hasSameOrigin } from "@/lib/rooms/http";
import { ratePerformance, ScoreError, scoreSnapshot, type ScoreActor } from "@/lib/scores/state";
import { songApiError, songRoomAccess } from "@/lib/songs/api";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

function actorFor(access: { role: "host" | "guest" | "tv"; guestId?: string }): ScoreActor | null {
  if (access.role === "guest") return access.guestId ? { role: "guest", guestId: access.guestId } : null;
  return { role: access.role };
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const access = await playbackReader(code);
    const actor = actorFor(access);
    if (!actor) return NextResponse.json({ error: "This room has ended or expired." }, { status: 410, headers: noStore });
    return NextResponse.json(await scoreSnapshot(access.roomId, actor), { headers: noStore });
  } catch (error) { return playbackApiError(error, "Score snapshot failed"); }
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 512) return NextResponse.json({ error: "Rating request is too large." }, { status: 413 });
    const { code } = await params;
    const access = await songRoomAccess(code);
    const actor = actorFor(access);
    if (!actor) return NextResponse.json({ error: "Invalid rating." }, { status: 400, headers: noStore });
    const body = await request.json().catch(() => null) as { itemId?: unknown; stars?: unknown } | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid rating." }, { status: 400, headers: noStore });
    return NextResponse.json(await ratePerformance({ roomId: access.roomId, actor, itemId: body.itemId, stars: body.stars }), { headers: noStore });
  } catch (error) {
    if (error instanceof ScoreError) {
      const responses = {
        invalid: [400, "Choose 1 to 5 stars."],
        ended: [410, "This room has ended or expired."],
        forbidden: [403, "The host has turned guest ratings off."],
        closed: [409, "Rating for that song has closed. Rate the current performance instead."],
        limited: [429, "You are rating a little too quickly. Wait a moment and try again."],
      } as const;
      const [status, message] = responses[error.reason];
      return NextResponse.json({ error: message }, { status, headers: noStore });
    }
    return songApiError(error, "Rating failed");
  }
}
