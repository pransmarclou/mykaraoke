import { NextResponse } from "next/server";
import { hasSameOrigin } from "@/lib/rooms/http";
import { playbackApiError } from "@/lib/playback/api";
import { issueTvPairCode } from "@/lib/playback/state";
import { songRoomAccess } from "@/lib/songs/api";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    const { code } = await params;
    const access = await songRoomAccess(code);
    if (access.role !== "host") return NextResponse.json({ error: "Only the host can pair a display." }, { status: 403 });
    return NextResponse.json({ pairCode: await issueTvPairCode(access.roomId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return playbackApiError(error, "TV pairing code failed"); }
}
