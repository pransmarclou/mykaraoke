import { NextResponse } from "next/server";
import { hasSameOrigin } from "@/lib/rooms/http";
import { playbackApiError, playbackReader } from "@/lib/playback/api";
import { hostPlaybackCommand, playbackSnapshot, type HostPlaybackAction } from "@/lib/playback/state";
import { songRoomAccess } from "@/lib/songs/api";

export const runtime = "nodejs";
const actions = new Set<HostPlaybackAction>(["start", "pause", "resume", "skip"]);

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const access = await playbackReader(code);
    return NextResponse.json(await playbackSnapshot(access.roomId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return playbackApiError(error, "Playback snapshot failed"); }
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 1_024) return NextResponse.json({ error: "Playback request is too large." }, { status: 413 });
    const { code } = await params;
    const access = await songRoomAccess(code);
    const body = await request.json().catch(() => null) as { action?: HostPlaybackAction; requestKey?: string } | null;
    if (!body?.action || !actions.has(body.action) || typeof body.requestKey !== "string") return NextResponse.json({ error: "Invalid playback command." }, { status: 400 });
    if (access.role === "guest" && !access.guestId) return NextResponse.json({ error: "Invalid playback command." }, { status: 400 });
    const actor = access.role === "host" ? { role: "host" as const } : { role: "guest" as const, guestId: access.guestId! };
    return NextResponse.json(await hostPlaybackCommand(access.roomId, body.action, body.requestKey, actor), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return playbackApiError(error, "Playback command failed"); }
}
