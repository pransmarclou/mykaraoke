import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import { searchYouTube, SongSearchError, type SongResult } from "@/lib/songs/youtube";

type Row = { id: string; youtube_id: string; title: string; channel_title: string; duration_seconds: number };
function result(row: Row): SongResult {
  return { id: row.id, youtubeId: row.youtube_id, title: row.title, channelTitle: row.channel_title, durationSeconds: row.duration_seconds };
}

export async function roomSongSearch(roomId: string, actorKey: string, query: string): Promise<SongResult[]> {
  const client = await getDb().connect();
  let apiAttempted = false;
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [query]);
    const limit = await client.query<{ requests: number }>(
      `insert into public.song_search_limits (room_id, actor_key, usage_day, requests)
       values ($1, $2, (now() at time zone 'UTC')::date, 1)
       on conflict (room_id, actor_key, usage_day) do update set requests = song_search_limits.requests + 1
       returning requests`, [roomId, actorKey]);
    if (limit.rows[0].requests > 30) throw new SongSearchError("limited");
    const cached = await client.query<{ generation: string }>(
      `select generation from public.song_search_cache where query = $1 and fetched_at > now() - interval '15 minutes'`, [query]);
    if (cached.rows[0]) {
      const rows = await client.query<Row>(
        `select id, youtube_id, title, channel_title, duration_seconds from public.song_search_results
         where query = $1 and generation = $2 order by title, id`, [query, cached.rows[0].generation]);
      await client.query("commit");
      return rows.rows.map(result);
    }
    if (!process.env.YOUTUBE_API_KEY) throw new SongSearchError("unconfigured");
    const usage = await client.query<{ api_calls: number }>(
      `insert into public.song_search_usage (usage_day, api_calls)
       values ((now() at time zone 'UTC')::date, 1)
       on conflict (usage_day) do update set api_calls = song_search_usage.api_calls + 1
       returning api_calls`);
    if (usage.rows[0].api_calls > 50) throw new SongSearchError("quota");
    apiAttempted = true;
    const songs = await searchYouTube(query);
    const generation = randomUUID();
    await client.query(
      `insert into public.song_search_cache (query, generation, fetched_at) values ($1, $2, now())
       on conflict (query) do update set generation = excluded.generation, fetched_at = excluded.fetched_at`, [query, generation]);
    for (const song of songs) {
      await client.query(
        `insert into public.song_search_results (query, youtube_id, title, channel_title, duration_seconds, generation, fetched_at)
         values ($1, $2, $3, $4, $5, $6, now())
         on conflict (query, youtube_id) do update set title = excluded.title,
           channel_title = excluded.channel_title, duration_seconds = excluded.duration_seconds,
           generation = excluded.generation, fetched_at = excluded.fetched_at`,
        [query, song.youtubeId, song.title, song.channelTitle, song.durationSeconds, generation]);
    }
    const rows = await client.query<Row>(
      `select id, youtube_id, title, channel_title, duration_seconds from public.song_search_results
       where query = $1 and generation = $2 order by title, id`, [query, generation]);
    await client.query("delete from public.song_search_results where fetched_at < now() - interval '6 hours' and id not in (select search_result_id from public.queue_items)");
    await client.query("delete from public.song_search_cache where fetched_at < now() - interval '6 hours'");
    await client.query("delete from public.song_search_limits where usage_day < (now() at time zone 'UTC')::date - 2");
    await client.query("delete from public.song_search_usage where usage_day < (now() at time zone 'UTC')::date - 2");
    await client.query("commit");
    return rows.rows.map(result);
  } catch (error) {
    if (apiAttempted && error instanceof SongSearchError) await client.query("commit");
    else await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
