import { NextResponse } from "next/server";
import { songApiError, songRoomAccess } from "@/lib/songs/api";
import { roomSongSearch } from "@/lib/songs/search";
import { normalizeSongQuery } from "@/lib/songs/youtube";

export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Search this room from MyKaraoke." }, { status: 403 });
    const { code } = await params;
    const room = await songRoomAccess(code);
    const query = normalizeSongQuery(new URL(request.url).searchParams.get("q"));
    const songs = await roomSongSearch(room.roomId, room.role === "host" ? "host" : room.guestId!, query);
    return NextResponse.json({ songs }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return songApiError(error, "YouTube song search failed"); }
}
