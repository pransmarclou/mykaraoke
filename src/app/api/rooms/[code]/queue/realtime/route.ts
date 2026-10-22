import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { configuredRemoteMicTopic } from "@/lib/microphone/remote-topic";
import { playbackApiError, playbackReader } from "@/lib/playback/api";

export const runtime = "nodejs";

function webRtcIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];
  const stunUrl = process.env.WEBRTC_STUN_URL;
  if (stunUrl && /^stuns?:/u.test(stunUrl)) servers.push({ urls: stunUrl });
  const turnUrl = process.env.WEBRTC_TURN_URL;
  const username = process.env.WEBRTC_TURN_USERNAME;
  const credential = process.env.WEBRTC_TURN_CREDENTIAL;
  if (turnUrl && /^turns?:/u.test(turnUrl) && username && credential) servers.push({ urls: turnUrl, username, credential });
  return servers;
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const access = await playbackReader(code);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return NextResponse.json({ enabled: false }, { headers: { "Cache-Control": "no-store" } });
    const room = await getDb().query<{ queue_topic: string; current_item_id: string | null; requested_by: string | null }>(
      `select r.queue_topic, p.current_item_id, q.requested_by
         from public.rooms r
         left join public.playback_state p on p.room_id = r.id
         left join public.queue_items q on q.id = p.current_item_id
        where r.id = $1`,
      [access.roomId],
    );
    const current = room.rows[0];
    const mayUseMicrophone = access.role === "host" || (access.role === "guest" && access.guestId === current.requested_by);
    const microphoneTopic = mayUseMicrophone && current.current_item_id && current.requested_by
      ? configuredRemoteMicTopic(current.queue_topic, current.current_item_id, current.requested_by)
      : null;
    return NextResponse.json({
      enabled: true,
      url,
      key,
      topic: `queue:${current.queue_topic}`,
      ...(microphoneTopic ? { microphoneTopic, iceServers: webRtcIceServers() } : {}),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return playbackApiError(error, "Realtime room configuration failed"); }
}
