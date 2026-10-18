"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";
import { ArrowDown, ArrowUp, ListMusic, Music2, Search, Trash2 } from "lucide-react";
import type { QueueSnapshot } from "@/lib/songs/queue";
import type { SongResult } from "@/lib/songs/youtube";
import { youtubeThumbnailUrl } from "@/lib/songs/thumbnail";

type SearchState = { status: "idle" | "loading" | "results" | "empty" | "error"; songs: SongResult[]; message?: string };
const emptyQueue: QueueSnapshot = { version: 0, items: [] };
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
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle", songs: [] });
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let realtimeClient: SupabaseClient | undefined;
    let realtimeChannel: RealtimeChannel | undefined;
    async function refresh() {
      try {
        const response = await fetch(`/api/rooms/${code}/queue`, { cache: "no-store" });
        if (!active) return;
        if ([403, 404, 410].includes(response.status)) { setQueueState("ended"); return; }
        if (!response.ok) throw new Error("Queue unavailable");
        const snapshot = await response.json() as QueueSnapshot;
        if (active) { setQueue(snapshot); setQueueState("connected"); }
      } catch { if (active) setQueueState("reconnecting"); }
    }
    void refresh();
    async function subscribe() {
      try {
        const response = await fetch(`/api/rooms/${code}/queue/realtime`, { cache: "no-store" });
        if (!response.ok || !active) return;
        const config = await response.json() as { enabled: boolean; url?: string; key?: string; topic?: string };
        if (!active || !config.enabled || !config.url || !config.key || !config.topic) return;
        realtimeClient = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
        await realtimeClient.realtime.setAuth(config.key);
        if (!active) return;
        realtimeChannel = realtimeClient.channel(config.topic, { config: { private: true } })
          .on("broadcast", { event: "queue_changed" }, () => void refresh())
          .subscribe((status) => { if (status === "SUBSCRIBED") void refresh(); });
      } catch { /* Snapshot polling remains the recovery path. */ }
    }
    void subscribe();
    const timer = window.setInterval(() => void refresh(), 3_000);
    const online = () => void refresh();
    window.addEventListener("online", online);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("online", online); if (realtimeClient && realtimeChannel) void realtimeClient.removeChannel(realtimeChannel); };
  }, [code]);

  useEffect(() => {
    const normalized = query.normalize("NFKC").replace(/\s+/gu, " ").trim();
    if (normalized.length < 2) return;
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
  }, [code, query]);

  async function add(song: SongResult) {
    setQueueMessage("");
    setWorkingId(song.id);
    try {
      const response = await fetch(`/api/rooms/${code}/queue`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchResultId: song.id, singerName, requestKey: crypto.randomUUID() }),
      });
      if (!response.ok) { setQueueMessage(await responseError(response)); return; }
      setQueue(await response.json() as QueueSnapshot);
      setQueueMessage(`${song.title} added to the queue.`);
    } catch { setQueueMessage("Could not add this song. Check your connection and retry."); }
    finally { setWorkingId(null); }
  }

  async function change(id: string, action: "up" | "down" | "remove" | "skip") {
    setQueueMessage(""); setWorkingId(id);
    try {
      const response = await fetch(`/api/rooms/${code}/queue/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, expectedVersion: queue.version }),
      });
      if (!response.ok) { setQueueMessage(await responseError(response)); return; }
      setQueue(await response.json() as QueueSnapshot);
      setQueueMessage(action === "remove" ? "Song removed." : action === "skip" ? "Song skipped." : "Queue order updated.");
    } catch { setQueueMessage("Could not update the queue. Check your connection and retry."); }
    finally { setWorkingId(null); }
  }

  return <section className="feature-panel rounded-[1.75rem] p-6 sm:p-8" aria-labelledby="song-queue-title">
    <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-[#ffad69]"><ListMusic className="size-5" aria-hidden="true" /></span><div><h2 id="song-queue-title" className="text-xl font-black tracking-tight">Up next</h2><p className="text-sm text-muted-foreground">Shared order for everyone in this room</p></div></div>
    {queueState === "loading" ? <p role="status" className="mt-5 text-sm text-muted-foreground">Loading queue…</p> : null}
    {queueState === "reconnecting" ? <p role="status" className="mt-5 text-sm text-[#ffc16f]">Queue connection interrupted. Reconnecting…</p> : null}
    {queueState === "ended" ? <p role="alert" className="mt-5 text-sm text-[#ffb0a2]">This room ended or your access expired.</p> : null}
    {queueState === "connected" && queue.items.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">No songs yet. Search for a karaoke video and add the first one.</p> : null}
    <ol className="mt-5 space-y-3" data-testid="queue-list">{queue.items.map((item, index) => <li key={item.id} data-testid="queue-item" className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3"><span className="font-mono text-sm font-bold text-[#ffc16f]">{index + 1}.</span><SongThumbnail youtubeId={item.youtubeId} /><div className="min-w-0 flex-1"><p className="font-semibold text-white">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.singerName} · {item.channelTitle} · {duration(item.durationSeconds)}</p></div></div>
      {role === "host" ? <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3"><button type="button" aria-label={`Move ${item.title} up`} disabled={index === 0 || workingId !== null} onClick={() => void change(item.id, "up")} className="queue-action"><ArrowUp className="size-4" aria-hidden="true" /> Up</button><button type="button" aria-label={`Move ${item.title} down`} disabled={index === queue.items.length - 1 || workingId !== null} onClick={() => void change(item.id, "down")} className="queue-action"><ArrowDown className="size-4" aria-hidden="true" /> Down</button><button type="button" aria-label={`Skip ${item.title}`} disabled={workingId !== null} onClick={() => void change(item.id, "skip")} className="queue-action">Skip</button><button type="button" aria-label={`Remove ${item.title}`} disabled={workingId !== null} onClick={() => void change(item.id, "remove")} className="queue-action"><Trash2 className="size-4" aria-hidden="true" /> Remove</button></div> : null}
    </li>)}</ol>
    {queueMessage ? <p role="status" className="mt-4 text-sm text-[#ffc16f]">{queueMessage}</p> : null}
    <div className="mt-8 border-t border-white/10 pt-7"><div className="flex items-center gap-2"><Search className="size-5 text-[#ffc16f]" aria-hidden="true" /><h3 className="text-lg font-bold">Find a karaoke song</h3></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Searches YouTube for videos that report they support embedding. Playback availability is checked again when the host starts a song.</p>
      <label htmlFor={`singer-${role}`} className="mt-5 block text-sm font-semibold">Singer name</label><input id={`singer-${role}`} value={singerName} onChange={(event) => setSingerName(event.target.value)} maxLength={24} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-white" />
      <label htmlFor={`song-search-${role}`} className="mt-5 block text-sm font-semibold">Search YouTube karaoke</label><input id={`song-search-${role}`} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSearchState({ status: "idle", songs: [] }); }} placeholder="Song or artist" maxLength={80} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-white" />
      {searchState.status === "loading" ? <p role="status" className="mt-4 text-sm text-muted-foreground">Searching YouTube…</p> : null}
      {searchState.status === "empty" ? <p role="status" className="mt-4 text-sm text-muted-foreground">No supported results found. Try another song or artist.</p> : null}
      {searchState.status === "error" ? <p role="alert" className="mt-4 text-sm text-[#ffb0a2]">{searchState.message}</p> : null}
      {searchState.status === "results" ? <ul className="mt-4 space-y-2" data-testid="search-results">{searchState.songs.map((song) => <li key={song.id} className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:grid-cols-[7rem_minmax(0,1fr)_auto]"><SongThumbnail youtubeId={song.youtubeId} /><div className="min-w-0"><p className="font-semibold">{song.title}</p><p className="text-xs text-muted-foreground">{song.channelTitle} · {duration(song.durationSeconds)} · YouTube</p></div><button type="button" disabled={workingId !== null || singerName.trim().length < 2} onClick={() => void add(song)} className="col-span-2 justify-self-end rounded-lg bg-[#d92362] px-4 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-1">Add</button></li>)}</ul> : null}
      <p className="mt-4 text-xs text-muted-foreground">Results and metadata provided by YouTube. Videos stay on YouTube; MyKaraoke does not download them.</p>
    </div>
  </section>;
}
