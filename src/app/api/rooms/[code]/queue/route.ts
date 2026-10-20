import { NextResponse } from "next/server";
import { hasSameOrigin } from "@/lib/rooms/http";
import { songApiError, songRoomAccess } from "@/lib/songs/api";
import { addQueueItem, queueSnapshot } from "@/lib/songs/queue";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const room = await songRoomAccess(code);
    return NextResponse.json(await queueSnapshot(room.roomId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return songApiError(error, "Queue snapshot failed"); }
}
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    const { code } = await params;
    const room = await songRoomAccess(code);
    if (Number(request.headers.get("content-length") ?? 0) > 4_096) return NextResponse.json({ error: "Queue request is too large." }, { status: 413 });
    const body = await request.json().catch(() => null) as { searchResultId?: string; singerName?: unknown; duetSingerName?: unknown; requestKey?: string } | null;
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid queue request." }, { status: 400 });
    const snapshot = await addQueueItem({ roomId: room.roomId, role: room.role, guestId: room.guestId, searchResultId: body.searchResultId ?? "", singerName: body.singerName, duetSingerName: body.duetSingerName, requestKey: body.requestKey ?? "" });
    return NextResponse.json(snapshot, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return songApiError(error, "Queue add failed"); }
}
