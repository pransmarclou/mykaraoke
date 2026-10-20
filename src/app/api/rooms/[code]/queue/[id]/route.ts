import { NextResponse } from "next/server";
import { hasSameOrigin } from "@/lib/rooms/http";
import { songApiError, songRoomAccess } from "@/lib/songs/api";
import { mutateQueue } from "@/lib/songs/queue";

export const runtime = "nodejs";
export async function PATCH(request: Request, { params }: { params: Promise<{ code: string; id: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    const { code, id } = await params;
    const room = await songRoomAccess(code);
    if (Number(request.headers.get("content-length") ?? 0) > 4_096) return NextResponse.json({ error: "Queue request is too large." }, { status: 413 });
    const body = await request.json().catch(() => null) as { action?: string; expectedVersion?: number } | null;
    if (!body || (body.action !== "up" && body.action !== "down" && body.action !== "remove" && body.action !== "skip")) {
      return NextResponse.json({ error: "Invalid queue action." }, { status: 400 });
    }
    return NextResponse.json(await mutateQueue({ roomId: room.roomId, role: room.role, guestId: room.guestId, id, action: body.action, expectedVersion: body.expectedVersion ?? -1 }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return songApiError(error, "Queue mutation failed"); }
}
