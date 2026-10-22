import { getDb } from "@/lib/db";

export type PopularSong = { youtubeId: string; title: string; channelTitle: string; durationSeconds: number; rooms: number };

export const POPULAR_WINDOW_DAYS = 30;
export const POPULAR_LIMIT = 20;
// A song appears only after this many different rooms requested it, so the
// list never reveals what one private party queued.
export const POPULAR_MIN_ROOMS = 2;

const CACHE_MS = 5 * 60_000;
let cache: { at: number; songs: PopularSong[] } | null = null;

export async function popularSongs(now = Date.now()): Promise<PopularSong[]> {
  if (cache && now - cache.at < CACHE_MS) return cache.songs;
  const result = await getDb().query<{ youtube_id: string; title: string; channel_title: string; duration_seconds: number; rooms: number }>(
    `select youtube_id,
            (array_agg(title order by created_at desc))[1] as title,
            (array_agg(channel_title order by created_at desc))[1] as channel_title,
            (array_agg(duration_seconds order by created_at desc))[1] as duration_seconds,
            count(distinct room_id)::int as rooms
       from public.queue_items
      where created_at > now() - make_interval(days => $1)
        and status in ('queued', 'playing', 'played')
      group by youtube_id
     having count(distinct room_id) >= $2
      order by rooms desc, max(created_at) desc
      limit $3`,
    [POPULAR_WINDOW_DAYS, POPULAR_MIN_ROOMS, POPULAR_LIMIT],
  );
  const songs = result.rows.map((row) => ({
    youtubeId: row.youtube_id,
    title: row.title,
    channelTitle: row.channel_title,
    durationSeconds: row.duration_seconds,
    rooms: row.rooms,
  }));
  cache = { at: now, songs };
  return songs;
}
