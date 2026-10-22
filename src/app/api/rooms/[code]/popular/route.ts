import { NextResponse } from "next/server";
import { songApiError, songRoomAccess } from "@/lib/songs/api";
import { popularSongs } from "@/lib/songs/popular";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    await songRoomAccess(code);
    return NextResponse.json({ songs: await popularSongs() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return songApiError(error, "Popular songs failed");
  }
}
