import { NextResponse } from "next/server";
import { remoteMicApiError } from "@/lib/microphone/remote-api";
import { parseRemoteMicSignalRequest } from "@/lib/microphone/remote-rules";
import { sendRemoteMicSignal } from "@/lib/microphone/remote-state";
import { hasSameOrigin } from "@/lib/rooms/http";
import { songRoomAccess } from "@/lib/songs/api";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 100_000) return NextResponse.json({ error: "Microphone signal is too large." }, { status: 413 });
    const { code } = await params;
    const access = await songRoomAccess(code);
    const signal = parseRemoteMicSignalRequest(await request.json().catch(() => null));
    if (!signal) return NextResponse.json({ error: "This microphone signal is invalid." }, { status: 400 });
    const event = await sendRemoteMicSignal({ roomId: access.roomId, role: access.role, guestId: access.guestId, signal });
    return NextResponse.json(event, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return remoteMicApiError(error, "Microphone signaling failed");
  }
}
