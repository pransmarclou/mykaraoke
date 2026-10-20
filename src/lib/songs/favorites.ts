import type { SongResult } from "@/lib/songs/youtube";

export const SONG_FAVORITES_STORAGE_KEY = "mykaraoke:song-favorites:v1";
export const MAX_SONG_FAVORITES = 100;

export type FavoriteSong = Omit<SongResult, "id">;

type StoredFavorites = {
  version: 1;
  items: FavoriteSong[];
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/u;

function favoriteSong(value: unknown): FavoriteSong | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<FavoriteSong>;
  const durationSeconds = item.durationSeconds;
  if (typeof item.youtubeId !== "string" || !YOUTUBE_ID.test(item.youtubeId)) return null;
  if (typeof item.title !== "string" || !item.title.trim() || item.title.length > 200) return null;
  if (typeof item.channelTitle !== "string" || !item.channelTitle.trim() || item.channelTitle.length > 100) return null;
  if (typeof durationSeconds !== "number" || !Number.isInteger(durationSeconds) || durationSeconds < 30 || durationSeconds > 3600) return null;
  return {
    youtubeId: item.youtubeId,
    title: item.title.trim(),
    channelTitle: item.channelTitle.trim(),
    durationSeconds,
  };
}

export function favoriteFromSong(song: SongResult): FavoriteSong {
  return {
    youtubeId: song.youtubeId,
    title: song.title,
    channelTitle: song.channelTitle,
    durationSeconds: song.durationSeconds,
  };
}

export function parseSongFavorites(raw: string | null): FavoriteSong[] {
  if (!raw || raw.length > 100_000) return [];
  try {
    const stored = JSON.parse(raw) as Partial<StoredFavorites>;
    if (stored.version !== 1 || !Array.isArray(stored.items)) return [];
    const seen = new Set<string>();
    const items: FavoriteSong[] = [];
    for (const value of stored.items) {
      const item = favoriteSong(value);
      if (!item || seen.has(item.youtubeId)) continue;
      seen.add(item.youtubeId);
      items.push(item);
      if (items.length === MAX_SONG_FAVORITES) break;
    }
    return items;
  } catch {
    return [];
  }
}

export function serializeSongFavorites(items: FavoriteSong[]): string {
  return JSON.stringify({ version: 1, items: items.slice(0, MAX_SONG_FAVORITES) } satisfies StoredFavorites);
}

export function toggleSongFavorite(items: FavoriteSong[], song: FavoriteSong): FavoriteSong[] {
  if (items.some((item) => item.youtubeId === song.youtubeId)) {
    return items.filter((item) => item.youtubeId !== song.youtubeId);
  }
  return [song, ...items].slice(0, MAX_SONG_FAVORITES);
}
