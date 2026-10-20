import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { playbackApiError, playbackReader } from "@/lib/playback/api";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const access = await playbackReader(code);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return NextResponse.json({ enabled: false }, { headers: { "Cache-Control": "no-store" } });
    const room = await getDb().query<{ queue_topic: string }>("select queue_topic from public.rooms where id = $1", [access.roomId]);
    return NextResponse.json({ enabled: true, url, key, topic: `queue:${room.rows[0].queue_topic}` }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return playbackApiError(error, "Realtime room configuration failed"); }
}
