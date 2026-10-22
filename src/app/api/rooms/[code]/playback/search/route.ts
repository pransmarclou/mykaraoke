import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { playbackApiError } from "@/lib/playback/api";
import { PlaybackError, touchTv, tvRoomAccess } from "@/lib/playback/state";
import { TV_COOKIE_NAME } from "@/lib/rooms/http";
import { isValidRoomCode } from "@/lib/rooms/room-code";
import { songApiError } from "@/lib/songs/api";
import { roomSongSearch } from "@/lib/songs/search";
import { normalizeSongQuery } from "@/lib/songs/youtube";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (request.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ error: "Search this room from MyKaraoke." }, { status: 403 });
    }
    const { code } = await params;
    if (!isValidRoomCode(code)) throw new PlaybackError("invalid");
    const credential = (await cookies()).get(TV_COOKIE_NAME)?.value;
    const roomId = await tvRoomAccess(code, credential);
    if (!roomId || !credential) throw new PlaybackError("forbidden");
    await touchTv(roomId, credential);
    const query = normalizeSongQuery(new URL(request.url).searchParams.get("q"));
    const songs = await roomSongSearch(roomId, "tv-display", query);
    return NextResponse.json({ songs }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PlaybackError) return playbackApiError(error, "TV song search failed");
    return songApiError(error, "TV song search failed");
  }
}
