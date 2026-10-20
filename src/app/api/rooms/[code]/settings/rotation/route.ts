import { NextResponse } from "next/server";
import { hasSameOrigin } from "@/lib/rooms/http";
import { songApiError, songRoomAccess } from "@/lib/songs/api";
import { setFairRotation } from "@/lib/songs/queue";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 512) return NextResponse.json({ error: "Rotation request is too large." }, { status: 413 });
    const { code } = await params;
    const access = await songRoomAccess(code);
    if (access.role !== "host") return NextResponse.json({ error: "Only the host can change singer rotation." }, { status: 403 });
    const body = await request.json().catch(() => null) as { enabled?: unknown; expectedVersion?: unknown } | null;
    if (!body || typeof body.enabled !== "boolean" || !Number.isSafeInteger(body.expectedVersion)) {
      return NextResponse.json({ error: "Invalid rotation setting." }, { status: 400 });
    }
    return NextResponse.json(
      await setFairRotation(access.roomId, body.enabled, body.expectedVersion as number),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return songApiError(error, "Singer rotation update failed");
  }
}
