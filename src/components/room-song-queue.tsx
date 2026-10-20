"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";
import { ArrowDown, ArrowUp, Heart, ListMusic, Music2, Search, Trash2 } from "lucide-react";
import {
  favoriteFromSong,
  parseSongFavorites,
  serializeSongFavorites,
  SONG_FAVORITES_STORAGE_KEY,
  toggleSongFavorite,
  type FavoriteSong,
} from "@/lib/songs/favorites";
import type { QueueSnapshot } from "@/lib/songs/queue";
import { singerLabel } from "@/lib/songs/singers";
import type { SongResult } from "@/lib/songs/youtube";
import { youtubeThumbnailUrl } from "@/lib/songs/thumbnail";

type SearchState = { status: "idle" | "loading" | "results" | "empty" | "error"; songs: SongResult[]; message?: string };
const emptyQueue: QueueSnapshot = { version: 0, items: [], fairRotation: false };
const favoritesChangedEvent = "mykaraoke:favorites-changed";

function favoriteStorageSnapshot(): string | null {
  try { return window.localStorage.getItem(SONG_FAVORITES_STORAGE_KEY); }
  catch { return null; }
}
function emptyFavoriteStorageSnapshot(): null { return null; }
function subscribeToFavoriteStorage(notify: () => void) {
  const stored = (event: StorageEvent) => { if (event.key === null || event.key === SONG_FAVORITES_STORAGE_KEY) notify(); };
  window.addEventListener("storage", stored);
  window.addEventListener(favoritesChangedEvent, notify);
  return () => { window.removeEventListener("storage", stored); window.removeEventListener(favoritesChangedEvent, notify); };
}
async function responseError(response: Response): Promise<string> {
  try { return ((await response.json()) as { error?: string }).error ?? "Please try again."; }
  catch { return "Please try again."; }
}
function duration(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }

function SongThumbnail({ youtubeId }: { youtubeId: string }) {
  const [failed, setFailed] = useState(false);
  const src = youtubeThumbnailUrl(youtubeId);
  return <span className="grid aspect-video w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10 sm:w-28">
    {src && !failed
      ? <Image src={src} alt="" width={320} height={180} unoptimized loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      : <Music2 className="size-6 text-[#ffc16f]" aria-hidden="true" />}
  </span>;
}

export function RoomSongQueue({ code, role, singer }: { code: string; role: "host" | "guest"; singer: string }) {
  const [queue, setQueue] = useState<QueueSnapshot>(emptyQueue);
  const [queueState, setQueueState] = useState<"loading" | "connected" | "reconnecting" | "ended">("loading");
  const [queueMessage, setQueueMessage] = useState("");
  const [query, setQuery] = useState("");
  const [singerName, setSingerName] = useState(singer);
  const [duetEnabled, setDuetEnabled] = useState(false);
  const [duetSingerName, setDuetSingerName] = useState("");
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle", songs: [] });
  const favoriteStorage = useSyncExternalStore(subscribeToFavoriteStorage, favoriteStorageSnapshot, emptyFavoriteStorageSnapshot);
  const favorites = useMemo(() => parseSongFavorites(favoriteStorage), [favoriteStorage]);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const pendingAdds = useRef(new Map<string, string>());
  const canAssignSingers = singerName.trim().length >= 2 && (!duetEnabled || duetSingerName.trim().length >= 2);

  useEffect(() => {
    let active = true;
    let terminal = false;
    let realtimeClient: SupabaseClient | undefined;
    let realtimeChannel: RealtimeChannel | undefined;
    let retryTimer: number | undefined;
    let retryCount = 0;
    let connecting = false;
    async function refresh() {
      if (terminal) return;
      try {
        const response = await fetch(`/api/rooms/${code}/queue`, { cache: "no-store" });
        if (!active) return;
        if ([403, 404, 410].includes(response.status)) { terminal = true; if (retryTimer) window.clearTimeout(retryTimer); const client = realtimeClient; const channel = realtimeChannel; if (client && channel) { void client.removeChannel(channel); void client.realtime.disconnect(); } setQueue(emptyQueue); setQueueState("ended"); setSearchState({ status: "idle", songs: [] }); return; }
        if (!response.ok) throw new Error("Queue unavailable");
        const snapshot = await response.json() as QueueSnapshot;
        if (active && !terminal) { setQueue((current) => snapshot.version >= current.version ? snapshot : current); setQueueState("connected"); }
      } catch { if (active && !terminal) setQueueState("reconnecting"); }
    }
    void refresh();
    function scheduleRealtimeRetry() {
      if (!active || terminal || retryTimer !== undefined) return;
      const delay = Math.min(30_000, 1_000 * 2 ** Math.min(retryCount++, 5));
      retryTimer = window.setTimeout(() => { retryTimer = undefined; void subscribe(); }, delay);
    }
    async function subscribe() {
      if (!active || terminal || connecting || realtimeChannel) return;
      connecting = true;
      try {
        const response = await fetch(`/api/rooms/${code}/queue/realtime`, { cache: "no-store" });
        if (!response.ok) throw new Error("Realtime config unavailable");
        if (!active || terminal) return;
        const config = await response.json() as { enabled: boolean; url?: string; key?: string; topic?: string };
        if (!active || !config.enabled || !config.url || !config.key || !config.topic) return;
        const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `mk-queue-${code}-${crypto.randomUUID()}` } });
        await client.realtime.setAuth(config.key);
        if (!active || terminal) { void client.realtime.disconnect(); return; }
        const channel = client.channel(config.topic, { config: { private: true } })
          .on("broadcast", { event: "queue_changed" }, () => void refresh())
          .subscribe((status) => {
            if (status === "SUBSCRIBED") { retryCount = 0; void refresh(); }
            else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status) && realtimeChannel === channel) {
              realtimeChannel = undefined;
              realtimeClient = undefined;
              void client.removeChannel(channel);
              void client.realtime.disconnect();
              scheduleRealtimeRetry();
            }
          });
        realtimeClient = client;
        realtimeChannel = channel;
      } catch { scheduleRealtimeRetry(); /* Snapshot polling remains the recovery path. */ }
      finally { connecting = false; }
    }
    void subscribe();
    const timer = window.setInterval(() => void refresh(), 3_000);
    const online = () => { void refresh(); if (!realtimeChannel) { if (retryTimer) window.clearTimeout(retryTimer); retryTimer = undefined; void subscribe(); } };
    window.addEventListener("online", online);
    return () => { active = false; window.clearInterval(timer); if (retryTimer) window.clearTimeout(retryTimer); window.removeEventListener("online", online); const client = realtimeClient; const channel = realtimeChannel; if (client && channel) { void client.removeChannel(channel); void client.realtime.disconnect(); } };
  }, [code]);

  useEffect(() => {
    const normalized = query.normalize("NFKC").replace(/\s+/gu, " ").trim();
    if (normalized.length < 2 || queueState === "ended") return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchState({ status: "loading", songs: [] });
      try {
        const response = await fetch(`/api/rooms/${code}/search?q=${encodeURIComponent(normalized)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) { setSearchState({ status: "error", songs: [], message: await responseError(response) }); return; }
        const { songs } = await response.json() as { songs: SongResult[] };
        setSearchState({ status: songs.length ? "results" : "empty", songs });
      } catch { if (!controller.signal.aborted) setSearchState({ status: "error", songs: [], message: "Search is unavailable. Check your connection and try again." }); }
    }, 500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [code, query, queueState]);

  async function add(song: SongResult, workingKey = song.id) {
    if (queueState !== "connected") return;
    setQueueMessage("");
    setWorkingId(workingKey);
    const requestKey = pendingAdds.current.get(song.id) ?? crypto.randomUUID();
    pendingAdds.current.set(song.id, requestKey);
    try {
      const response = await fetch(`/api/rooms/${code}/queue`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchResultId: song.id, singerName, duetSingerName: duetEnabled ? duetSingerName : null, requestKey }),
      });
      if (!response.ok) { pendingAdds.current.delete(song.id); setQueueMessage(await responseError(response)); return; }
      const snapshot = await response.json() as QueueSnapshot;
      setQueue((current) => snapshot.version >= current.version ? snapshot : current);
      pendingAdds.current.delete(song.id);
      setQueueMessage(`${song.title} added to the queue.`);
    } catch { setQueueMessage("Could not add this song. Check your connection and retry."); }
    finally { setWorkingId(null); }
  }

  function toggleFavorite(song: SongResult | FavoriteSong) {
    const favorite = "id" in song ? favoriteFromSong(song) : song;
    const next = toggleSongFavorite(favorites, favorite);
    try {
      window.localStorage.setItem(SONG_FAVORITES_STORAGE_KEY, serializeSongFavorites(next));
      window.dispatchEvent(new Event(favoritesChangedEvent));
      setQueueMessage(next.some((item) => item.youtubeId === favorite.youtubeId) ? `${favorite.title} saved to this browser.` : `${favorite.title} removed from favorites.`);
    } catch {
      setQueueMessage("This browser could not save favorites. Check its storage settings and try again.");
    }
  }

  async function addFavorite(favorite: FavoriteSong) {
    if (queueState !== "connected") return;
    const workingKey = `favorite:${favorite.youtubeId}`;
    setQueueMessage("");
    setWorkingId(workingKey);
    try {
      const response = await fetch(`/api/rooms/${code}/search?q=${encodeURIComponent(favorite.title.slice(0, 80))}`, { cache: "no-store" });
      if (!response.ok) { setQueueMessage(await responseError(response)); return; }
      const { songs } = await response.json() as { songs: SongResult[] };
      const current = songs.find((song) => song.youtubeId === favorite.youtubeId);
      if (!current) { setQueueMessage("This favorite is not currently available in YouTube search. Try searching for another version."); return; }
      setWorkingId(null);
      await add(current, workingKey);
    } catch {
      setQueueMessage("Could not refresh this favorite. Check your connection and retry.");
    } finally {
      setWorkingId(null);
    }
  }

  async function change(id: string, action: "up" | "down" | "remove" | "skip") {
    if (queueState !== "connected") return;
    setQueueMessage(""); setWorkingId(id);
    try {
      const response = await fetch(`/api/rooms/${code}/queue/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, expectedVersion: queue.version }),
      });
      if (!response.ok) { setQueueMessage(await responseError(response)); if (response.status === 409) void fetch(`/api/rooms/${code}/queue`, { cache: "no-store" }).then(async (latest) => { if (latest.ok) { const snapshot = await latest.json() as QueueSnapshot; setQueue((current) => snapshot.version >= current.version ? snapshot : current); } }).catch(() => {}); return; }
      const snapshot = await response.json() as QueueSnapshot;
      setQueue((current) => snapshot.version >= current.version ? snapshot : current);
      setQueueMessage(action === "remove" ? "Song removed." : action === "skip" ? "Song skipped." : queue.fairRotation ? "Manual order saved. Fair rotation is now off." : "Queue order updated.");
    } catch { setQueueMessage("Could not update the queue. Check your connection and retry."); }
    finally { setWorkingId(null); }
  }

  async function toggleFairRotation() {
    if (role !== "host" || queueState !== "connected" || workingId !== null) return;
    setWorkingId("rotation");
    setQueueMessage("");
    try {
      const response = await fetch(`/api/rooms/${code}/settings/rotation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !queue.fairRotation, expectedVersion: queue.version }),
      });
      if (!response.ok) {
        setQueueMessage(await responseError(response));
        if (response.status === 409) {
          void fetch(`/api/rooms/${code}/queue`, { cache: "no-store" }).then(async (latest) => {
            if (latest.ok) {
              const snapshot = await latest.json() as QueueSnapshot;
              setQueue((current) => snapshot.version >= current.version ? snapshot : current);
            }
          }).catch(() => {});
        }
        return;
      }
      const snapshot = await response.json() as QueueSnapshot;
      setQueue((current) => snapshot.version >= current.version ? snapshot : current);
      setQueueMessage(snapshot.fairRotation ? "Fair rotation is on. Waiting songs were arranged by singer." : "Fair rotation is off. Existing queue order was preserved.");
    } catch {
      setQueueMessage("Could not update singer rotation. Check your connection and retry.");
    } finally {
      setWorkingId(null);
    }
  }

  return <section className="feature-panel rounded-[1.75rem] p-6 sm:p-8" aria-labelledby="song-queue-title">
    <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-[#ffad69]"><ListMusic className="size-5" aria-hidden="true" /></span><div><h2 id="song-queue-title" className="text-xl font-black tracking-tight">Up next</h2><p className="text-sm text-muted-foreground">Shared order for everyone in this room</p></div></div>
    {queueState === "connected" ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"><div><p className="text-sm font-bold text-white">Fair singer rotation</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Alternates waiting singers while keeping each singer&apos;s songs in request order.</p></div>{role === "host" ? <button type="button" aria-label={queue.fairRotation ? "Turn fair singer rotation off" : "Turn fair singer rotation on"} aria-pressed={queue.fairRotation} disabled={workingId !== null} onClick={() => void toggleFairRotation()} className={`queue-action min-h-11 ${queue.fairRotation ? "border-[#ff6e8f]/60 bg-[#d92362]/25" : ""}`}>{workingId === "rotation" ? "Saving…" : queue.fairRotation ? "On" : "Off"}</button> : <span className={`rounded-full px-3 py-1 text-xs font-bold ${queue.fairRotation ? "bg-[#d92362]/25 text-[#ffb0c3]" : "bg-white/5 text-muted-foreground"}`}>{queue.fairRotation ? "On" : "Off"}</span>}</div> : null}
    {queueState === "loading" ? <p role="status" className="mt-5 text-sm text-muted-foreground">Loading queue…</p> : null}
    {queueState === "reconnecting" ? <p role="status" className="mt-5 text-sm text-[#ffc16f]">Queue connection interrupted. Reconnecting…</p> : null}
    {queueState === "ended" ? <p role="alert" className="mt-5 text-sm text-[#ffb0a2]">This room ended or your access expired.</p> : null}
    {queueState === "connected" && queue.items.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">No songs yet. Search for a karaoke video and add the first one.</p> : null}
    <ol className="mt-5 space-y-3" data-testid="queue-list">{queueState !== "ended" ? queue.items.map((item, index) => <li key={item.id} data-testid="queue-item" className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3"><span className="font-mono text-sm font-bold text-[#ffc16f]">{index + 1}.</span><SongThumbnail youtubeId={item.youtubeId} /><div className="min-w-0 flex-1"><p className="font-semibold text-white">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{singerLabel(item)} · {item.channelTitle} · {duration(item.durationSeconds)}</p></div></div>
      {role === "host" ? <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3"><button type="button" aria-label={`Move ${item.title} up`} disabled={index === 0 || workingId !== null || queueState !== "connected"} onClick={() => void change(item.id, "up")} className="queue-action"><ArrowUp className="size-4" aria-hidden="true" /> Up</button><button type="button" aria-label={`Move ${item.title} down`} disabled={index === queue.items.length - 1 || workingId !== null || queueState !== "connected"} onClick={() => void change(item.id, "down")} className="queue-action"><ArrowDown className="size-4" aria-hidden="true" /> Down</button><button type="button" aria-label={`Skip ${item.title}`} disabled={workingId !== null || queueState !== "connected"} onClick={() => void change(item.id, "skip")} className="queue-action">Skip</button><button type="button" aria-label={`Remove ${item.title}`} disabled={workingId !== null || queueState !== "connected"} onClick={() => void change(item.id, "remove")} className="queue-action"><Trash2 className="size-4" aria-hidden="true" /> Remove</button></div> : null}
    </li>) : null}</ol>
    {queueMessage ? <p role="status" className="mt-4 text-sm text-[#ffc16f]">{queueMessage}</p> : null}
    {queueState !== "ended" ? <div className="mt-8 border-t border-white/10 pt-7"><div className="flex items-center gap-2"><Search className="size-5 text-[#ffc16f]" aria-hidden="true" /><h3 className="text-lg font-bold">Find a karaoke song</h3></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Searches YouTube for videos that report they support embedding. Playback availability is checked again when the host starts a song.</p>
      <label htmlFor={`singer-${role}`} className="mt-5 block text-sm font-semibold">Singer name</label><input id={`singer-${role}`} value={singerName} onChange={(event) => setSingerName(event.target.value)} maxLength={24} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-white" />
      <label htmlFor={`duet-${role}`} className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold"><input id={`duet-${role}`} type="checkbox" checked={duetEnabled} onChange={(event) => { setDuetEnabled(event.target.checked); if (!event.target.checked) setDuetSingerName(""); }} className="size-4 accent-[#d92362]" />Add a duet partner</label>
      {duetEnabled ? <div><label htmlFor={`duet-singer-${role}`} className="mt-4 block text-sm font-semibold">Duet partner name</label><input id={`duet-singer-${role}`} value={duetSingerName} onChange={(event) => setDuetSingerName(event.target.value)} maxLength={24} aria-describedby={`duet-help-${role}`} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-white" /><p id={`duet-help-${role}`} className="mt-2 text-xs text-muted-foreground">Choose a different person. Both singers share one turn in fair rotation.</p></div> : null}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4" data-testid="song-favorites"><div className="flex items-center gap-2"><Heart className="size-4 text-[#ff6e8f]" aria-hidden="true" /><h4 className="font-bold">Favorites on this browser</h4></div><p className="mt-1 text-xs text-muted-foreground">Saved only on this device. MyKaraoke refreshes YouTube availability before adding one.</p>
        {favorites.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Use Save on a search result to keep it here.</p> : <ul className="mt-3 space-y-2">{favorites.map((favorite) => <li key={favorite.youtubeId} className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center"><SongThumbnail youtubeId={favorite.youtubeId} /><div className="min-w-0 flex-1"><p className="font-semibold">{favorite.title}</p><p className="text-xs text-muted-foreground">{favorite.channelTitle} · {duration(favorite.durationSeconds)}</p></div><div className="flex gap-2 self-end sm:self-auto"><button type="button" disabled={workingId !== null || !canAssignSingers || queueState !== "connected"} onClick={() => void addFavorite(favorite)} className="rounded-lg bg-[#d92362] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{workingId === `favorite:${favorite.youtubeId}` ? "Checking…" : "Add"}</button><button type="button" aria-label={`Remove ${favorite.title} from favorites`} onClick={() => toggleFavorite(favorite)} className="queue-action"><Trash2 className="size-4" aria-hidden="true" /> Remove</button></div></li>)}</ul>}
      </div>
      <label htmlFor={`song-search-${role}`} className="mt-5 block text-sm font-semibold">Search YouTube karaoke</label><input id={`song-search-${role}`} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSearchState({ status: "idle", songs: [] }); }} placeholder="Song or artist" maxLength={80} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-white" />
      {searchState.status === "loading" ? <p role="status" className="mt-4 text-sm text-muted-foreground">Searching YouTube…</p> : null}
      {searchState.status === "empty" ? <p role="status" className="mt-4 text-sm text-muted-foreground">No supported results found. Try another song or artist.</p> : null}
      {searchState.status === "error" ? <p role="alert" className="mt-4 text-sm text-[#ffb0a2]">{searchState.message}</p> : null}
      {searchState.status === "results" ? <ul className="mt-4 space-y-2" data-testid="search-results">{searchState.songs.map((song) => { const saved = favorites.some((favorite) => favorite.youtubeId === song.youtubeId); return <li key={song.id} className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto]"><SongThumbnail youtubeId={song.youtubeId} /><div className="min-w-0"><p className="font-semibold">{song.title}</p><p className="text-xs text-muted-foreground">{song.channelTitle} · {duration(song.durationSeconds)} · YouTube</p></div><div className="col-span-2 flex justify-self-end gap-2 sm:col-span-1"><button type="button" aria-pressed={saved} onClick={() => toggleFavorite(song)} className="queue-action"><Heart className={`size-4 ${saved ? "fill-current text-[#ff6e8f]" : ""}`} aria-hidden="true" /> {saved ? "Saved" : "Save"}</button><button type="button" disabled={workingId !== null || !canAssignSingers || queueState !== "connected"} onClick={() => void add(song)} className="rounded-lg bg-[#d92362] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Add</button></div></li>; })}</ul> : null}
      <p className="mt-4 text-xs text-muted-foreground">Results and metadata provided by YouTube. Videos stay on YouTube; MyKaraoke does not download them.</p>
    </div> : null}
  </section>;
}
