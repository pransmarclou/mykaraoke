export type SongResult = {
  id: string;
  youtubeId: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
};

export class SongSearchError extends Error {
  constructor(public readonly reason: "invalid" | "unconfigured" | "quota" | "unavailable" | "limited") {
    super(reason);
  }
}

export function normalizeSongQuery(value: unknown): string {
  if (typeof value !== "string") throw new SongSearchError("invalid");
  const query = value.normalize("NFKC").replace(/\s+/gu, " ").trim();
  if (query.length < 2 || query.length > 80 || /[\u0000-\u001f\u007f]/u.test(query)) throw new SongSearchError("invalid");
  return query;
}

function plainText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/&amp;/giu, "&").replace(/&quot;/giu, '"').replace(/&#39;|&#x27;/giu, "'").replace(/&lt;/giu, "<").replace(/&gt;/giu, ">").replace(/\s+/gu, " ").trim();
  return text ? text.slice(0, max) : null;
}

export function durationSeconds(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/u.exec(value);
  if (!match || !match.slice(1).some(Boolean)) return null;
  const seconds = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
  return Number.isInteger(seconds) && seconds >= 30 && seconds <= 3600 ? seconds : null;
}

type SearchPayload = { items?: Array<{ id?: { videoId?: unknown }; snippet?: { title?: unknown; channelTitle?: unknown } }> };
type VideosPayload = { items?: Array<{ id?: unknown; status?: { embeddable?: unknown; privacyStatus?: unknown }; contentDetails?: { duration?: unknown } }> };

export function mapYouTubeResults(search: SearchPayload, videos: VideosPayload): Omit<SongResult, "id">[] {
  const verified = new Map<string, number>();
  for (const video of videos.items ?? []) {
    if (typeof video.id !== "string" || !/^[A-Za-z0-9_-]{11}$/u.test(video.id)) continue;
    if (video.status?.embeddable !== true || video.status?.privacyStatus !== "public") continue;
    const seconds = durationSeconds(video.contentDetails?.duration);
    if (seconds !== null) verified.set(video.id, seconds);
  }
  const result: Omit<SongResult, "id">[] = [];
  const seen = new Set<string>();
  for (const item of search.items ?? []) {
    const id = item.id?.videoId;
    if (typeof id !== "string" || !verified.has(id) || seen.has(id)) continue;
    const title = plainText(item.snippet?.title, 200);
    const channelTitle = plainText(item.snippet?.channelTitle, 100);
    if (!title || !channelTitle) continue;
    seen.add(id);
    result.push({ youtubeId: id, title, channelTitle, durationSeconds: verified.get(id)! });
  }
  return result;
}

async function youtubeGet(path: "search" | "videos", params: URLSearchParams, fetcher: typeof fetch): Promise<unknown> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new SongSearchError("unconfigured");
  const base = process.env.YOUTUBE_API_BASE_URL && process.env.NODE_ENV !== "production"
    ? process.env.YOUTUBE_API_BASE_URL : "https://www.googleapis.com/youtube/v3";
  if (base !== "https://www.googleapis.com/youtube/v3" && !/^http:\/\/(127\.0\.0\.1|localhost):\d+\/youtube\/v3$/u.test(base)) {
    throw new SongSearchError("unavailable");
  }
  params.set("key", key);
  let response: Response;
  try {
    response = await fetcher(`${base}/${path}?${params}`, { signal: AbortSignal.timeout(8_000), cache: "no-store" });
  } catch {
    throw new SongSearchError("unavailable");
  }
  if (response.status === 429) throw new SongSearchError("quota");
  if (response.status === 403) {
    const body = await response.json().catch(() => null) as { error?: { errors?: Array<{ reason?: string }> } } | null;
    const reasons = body?.error?.errors?.map((error) => error.reason) ?? [];
    throw new SongSearchError(reasons.some((reason) => reason && /quota|limit|rate/iu.test(reason)) ? "quota" : "unavailable");
  }
  if (!response.ok) throw new SongSearchError("unavailable");
  try { return await response.json(); } catch { throw new SongSearchError("unavailable"); }
}

export async function searchYouTube(query: string, fetcher: typeof fetch = fetch): Promise<Omit<SongResult, "id">[]> {
  const searchParams = new URLSearchParams({ part: "snippet", q: `${query} karaoke`, type: "video", videoEmbeddable: "true", videoSyndicated: "true", maxResults: "12", safeSearch: "moderate" });
  const search = await youtubeGet("search", searchParams, fetcher) as SearchPayload;
  const ids = (search.items ?? []).map((item) => item.id?.videoId).filter((id): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{11}$/u.test(id));
  if (!ids.length) return [];
  const videos = await youtubeGet("videos", new URLSearchParams({ part: "status,contentDetails", id: ids.join(",") }), fetcher) as VideosPayload;
  return mapYouTubeResults(search, videos);
}
