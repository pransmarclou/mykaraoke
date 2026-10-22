"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Image from "next/image";
import { Flame, Heart, ListMusic, MonitorPlay, Mic2, Search, Trophy, UserRound, X } from "lucide-react";
import { GuestRoomActions } from "@/components/guest-room-actions";
import { formatDuration, SongThumbnail } from "@/components/song-thumbnail";
import { responseError, useRoomSongs } from "@/components/use-room-songs";
import type { PlaybackSnapshot } from "@/lib/playback/state";
import { ROOM_REACTIONS, type RoomReactionId } from "@/lib/reactions/rules";
import type { PopularSong } from "@/lib/songs/popular";
import { singerLabel } from "@/lib/songs/singers";
import { getPartyTheme } from "@/lib/themes/rules";

type TabId = "popular" | "queue" | "stage" | "scores" | "mine" | "favorites";
const TABS: { id: TabId; label: string; icon: typeof Flame }[] = [
  { id: "popular", label: "Popular", icon: Flame },
  { id: "queue", label: "Queue", icon: ListMusic },
  { id: "stage", label: "Stage", icon: MonitorPlay },
  { id: "scores", label: "Scores", icon: Trophy },
  { id: "mine", label: "My songs", icon: Mic2 },
  { id: "favorites", label: "Favorites", icon: Heart },
];

type GuestPhoneRoomProps = {
  code: string;
  guestId: string;
  guestLabel: string;
  stage: ReactNode;
  scores: ReactNode;
  people: ReactNode;
};

function usePlaybackSnapshot(code: string) {
  const [state, setState] = useState<PlaybackSnapshot | null>(null);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch(`/api/rooms/${code}/playback`, { cache: "no-store" });
        if (!response.ok) return;
        const snapshot = await response.json() as PlaybackSnapshot;
        if (active) setState(snapshot);
      } catch { /* The Stage tab shows connection problems in detail. */ }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 4_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [code]);
  return state;
}

function ReactionButton({ code, enabled }: { code: string; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3_000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function send(reaction: RoomReactionId, label: string) {
    setSending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/rooms/${code}/reactions`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reaction }),
      });
      setMessage(response.ok ? `${label} sent to the TV.` : await responseError(response));
      if (response.ok) setOpen(false);
    } catch {
      setMessage("Could not send your reaction. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return <div className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-end gap-2">
    {message ? <p role="status" className="max-w-56 rounded-xl bg-black/80 px-3 py-2 text-xs text-white">{message}</p> : null}
    {open ? <div role="group" aria-label="Cheer the singer" className="flex gap-1 rounded-2xl border border-white/15 bg-[#12121c]/95 p-1.5 shadow-2xl backdrop-blur-xl">
      {ROOM_REACTIONS.map((reaction) => <button key={reaction.id} type="button" aria-label={`Send ${reaction.label}`} disabled={!enabled || sending} onClick={() => void send(reaction.id, reaction.label)} className="grid size-12 place-items-center rounded-xl text-2xl transition hover:bg-white/10 disabled:opacity-45"><span aria-hidden="true">{reaction.emoji}</span></button>)}
    </div> : null}
    <button type="button" aria-expanded={open} aria-label={open ? "Close reactions" : "Open reactions"} disabled={!enabled} onClick={() => setOpen((value) => !value)} className="grid size-14 place-items-center rounded-full bg-primary text-2xl text-white shadow-[0_12px_32px_rgba(0,0,0,.45)] ring-2 ring-white/20 transition disabled:opacity-40">
      {open ? <X className="size-6" aria-hidden="true" /> : <span aria-hidden="true">🎉</span>}
    </button>
  </div>;
}

export function GuestPhoneRoom({ code, guestId, guestLabel, stage, scores, people }: GuestPhoneRoomProps) {
  const songs = useRoomSongs({ code, role: "guest", singer: guestLabel });
  const {
    queue, queueState, queueMessage, query, setQuery, searchState, setSearchState,
    singerName, setSingerName, duetEnabled, setDuetEnabled, duetSingerName, setDuetSingerName,
    favorites, workingId, canAssignSingers, canAddSongs, canManageQueue,
    add, toggleFavorite, addFavorite, addByLookup, change,
  } = songs;
  const playback = usePlaybackSnapshot(code);
  const [tab, setTab] = useState<TabId>("popular");
  const [popular, setPopular] = useState<{ status: "idle" | "loading" | "ready" | "error"; songs: PopularSong[] }>({ status: "idle", songs: [] });
  const searchInput = useRef<HTMLInputElement>(null);
  const tabRefs = useRef(new Map<TabId, HTMLButtonElement>());
  const searching = query.trim().length > 0;
  const mine = queue.items.filter((item) => item.requestedBy === guestId);
  const current = playback?.current ?? null;
  const reactionsEnabled = Boolean(current) && (playback?.guestPermissions.reactions ?? false);

  const popularRequested = useRef(false);
  useEffect(() => {
    if (tab !== "popular" || popularRequested.current) return;
    // Fetched once per page; the list is a 5-minute server cache anyway.
    popularRequested.current = true;
    void (async () => {
      setPopular({ status: "loading", songs: [] });
      try {
        const response = await fetch(`/api/rooms/${code}/popular`, { cache: "no-store" });
        if (!response.ok) throw new Error("Popular songs unavailable");
        const { songs: list } = await response.json() as { songs: PopularSong[] };
        setPopular({ status: "ready", songs: list });
      } catch {
        setPopular({ status: "error", songs: [] });
      }
    })();
  }, [code, tab]);

  function selectTab(id: TabId) {
    setTab(id);
    tabRefs.current.get(id)?.focus();
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.findIndex((item) => item.id === tab);
    const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    selectTab(TABS[(next + TABS.length) % TABS.length].id);
  }

  const addDisabled = workingId !== null || !canAssignSingers || queueState !== "connected";
  const addButton = (label: string, onClick: () => void, busy: boolean) => <button type="button" aria-label={label} disabled={addDisabled} onClick={onClick} className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-xl font-black text-white shadow-[0_8px_20px_rgba(0,0,0,.35)] disabled:opacity-45">{busy ? "…" : <span aria-hidden="true">+</span>}</button>;

  return <div className="mx-auto w-full max-w-xl pb-28">
    <header className="sticky top-0 z-40 -mx-4 flex items-center gap-2 border-b border-white/10 bg-[#0b0d16]/90 px-4 py-3 backdrop-blur-xl">
      <Image src="/brand/microphone-logo.png" alt="MyKaraoke" width={32} height={32} className="size-8 shrink-0" />
      <p className="min-w-0 flex-1 text-sm font-bold text-muted-foreground">Room <span className="font-mono text-base font-black tracking-wider text-accent">{code}</span></p>
      <span className="flex max-w-[8.5rem] items-center gap-1 truncate rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white"><UserRound className="size-4 shrink-0" aria-hidden="true" /><span className="truncate">{guestLabel}</span></span>
      <GuestRoomActions code={code} compact />
    </header>

    {queueState === "ended" ? <p role="alert" className="mt-5 text-sm text-[#ffb0a2]">This room ended or your access expired.</p> : null}

    {queueState !== "ended" && canAddSongs ? <form role="search" className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); searchInput.current?.blur(); }}>
      <label className="flex h-13 min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 focus-within:border-primary">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input ref={searchInput} type="search" aria-label="Search YouTube karaoke" value={query} onChange={(event) => { setQuery(event.target.value); setSearchState({ status: "idle", songs: [] }); }} placeholder="Search songs or artists" maxLength={80} className="h-12 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none" />
        {searching ? <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); setSearchState({ status: "idle", songs: [] }); }} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:text-white"><X className="size-4" aria-hidden="true" /></button> : null}
      </label>
      <button type="submit" className="h-13 shrink-0 rounded-2xl bg-primary px-5 font-black text-white">Go</button>
    </form> : null}
    {queueState === "connected" && !canAddSongs ? <p role="status" className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">The host has paused song requests from guests. You can still follow the queue here.</p> : null}

    {searching && canAddSongs ? <section aria-label="Search results" className="mt-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <label htmlFor="singer-guest" className="block text-xs font-semibold text-muted-foreground">Singer name</label>
        <input id="singer-guest" value={singerName} onChange={(event) => setSingerName(event.target.value)} maxLength={24} className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-white" />
        <label htmlFor="duet-guest" className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold"><input id="duet-guest" type="checkbox" checked={duetEnabled} onChange={(event) => { setDuetEnabled(event.target.checked); if (!event.target.checked) setDuetSingerName(""); }} className="size-4 accent-[var(--primary)]" />Add a duet partner</label>
        {duetEnabled ? <><label htmlFor="duet-singer-guest" className="block text-xs font-semibold text-muted-foreground">Duet partner name</label><input id="duet-singer-guest" value={duetSingerName} onChange={(event) => setDuetSingerName(event.target.value)} maxLength={24} className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-white" /></> : null}
      </div>
      {searchState.status === "loading" ? <p role="status" className="mt-4 text-sm text-muted-foreground">Searching YouTube…</p> : null}
      {searchState.status === "empty" ? <p role="status" className="mt-4 text-sm text-muted-foreground">No supported results found. Try another song or artist.</p> : null}
      {searchState.status === "error" ? <p role="alert" className="mt-4 text-sm text-[#ffb0a2]">{searchState.message}</p> : null}
      {searchState.status === "results" ? <ul className="mt-3 space-y-2" data-testid="search-results">{searchState.songs.map((song) => {
        const saved = favorites.some((favorite) => favorite.youtubeId === song.youtubeId);
        return <li key={song.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2.5">
          <SongThumbnail youtubeId={song.youtubeId} className="w-20" />
          <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-white">{song.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{song.channelTitle} · {formatDuration(song.durationSeconds)}</p></div>
          <button type="button" aria-pressed={saved} aria-label={saved ? `Remove ${song.title} from favorites` : `Save ${song.title} to favorites`} onClick={() => toggleFavorite(song)} className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-white"><Heart className={`size-5 ${saved ? "fill-current text-primary" : ""}`} aria-hidden="true" /></button>
          <button type="button" disabled={addDisabled} onClick={() => void add(song)} className="h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-black text-white disabled:opacity-45">Add</button>
        </li>;
      })}</ul> : null}
      <p className="mt-3 text-xs text-muted-foreground">Results and metadata provided by YouTube. Videos stay on YouTube.</p>
    </section> : null}

    {queueMessage ? <p role="status" className="mt-4 text-sm text-accent">{queueMessage}</p> : null}

    <button type="button" onClick={() => selectTab("stage")} className="mt-5 flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-primary to-accent p-4 text-left text-white shadow-[0_16px_40px_rgba(0,0,0,.35)]" data-testid="now-playing-card">
      {current ? <SongThumbnail youtubeId={current.youtubeId} className="w-20 rounded-xl" /> : <span className="grid size-14 shrink-0 place-items-center rounded-full bg-black/25"><Mic2 className="size-6" aria-hidden="true" /></span>}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold tracking-[0.18em] uppercase opacity-85">{current ? (playback?.observed === "playing" ? "Now singing" : "On stage") : "Stage is open"}</span>
        <span className="mt-1 block truncate text-lg font-black">{current ? current.title : "Waiting for the first song"}</span>
        <span className="block truncate text-sm opacity-85">{current ? singerLabel(current) : `${playback?.queuedCount ?? queue.items.length} queued · tap for stage controls`}</span>
      </span>
    </button>

    <div role="tablist" aria-label="Room sections" className="mt-5 -mx-4 flex gap-1 overflow-x-auto border-b border-white/10 px-4 [scrollbar-width:none]">
      {TABS.map(({ id, label, icon: Icon }) => <button key={id} ref={(node) => { if (node) tabRefs.current.set(id, node); }} type="button" role="tab" id={`guest-tab-${id}`} aria-controls={`guest-panel-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} onKeyDown={onTabKey} onClick={() => setTab(id)} className={`flex min-h-12 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-bold transition ${tab === id ? "border-primary text-white" : "border-transparent text-muted-foreground hover:text-white"}`}>
        <Icon className="size-4" aria-hidden="true" />{label}{id === "queue" && queue.items.length ? <span className="rounded-full bg-white/10 px-1.5 text-xs">{queue.items.length}</span> : null}
      </button>)}
    </div>

    <div role="tabpanel" id="guest-panel-popular" aria-labelledby="guest-tab-popular" hidden={tab !== "popular"} className="pt-4">
      <h2 className="text-lg font-black">Most requested songs</h2>
      <p className="mt-1 text-xs text-muted-foreground">Songs requested in at least two MyKaraoke rooms in the last 30 days.</p>
      {popular.status === "loading" ? <p role="status" className="mt-4 text-sm text-muted-foreground">Loading popular songs…</p> : null}
      {popular.status === "error" ? <p role="alert" className="mt-4 text-sm text-[#ffb0a2]">Popular songs are unavailable right now. Search instead.</p> : null}
      {popular.status === "ready" && popular.songs.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Not enough parties have requested songs yet. Search above to add one.</p> : null}
      <ol className="mt-3 space-y-2" data-testid="popular-songs">{popular.songs.map((song, index) => <li key={song.youtubeId} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2.5">
        <span className="w-7 shrink-0 text-center font-mono text-sm font-black text-accent">#{index + 1}</span>
        <SongThumbnail youtubeId={song.youtubeId} className="w-20" />
        <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-white">{song.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{song.channelTitle} · {formatDuration(song.durationSeconds)}</p></div>
        {canAddSongs ? addButton(`Add ${song.title}`, () => void addByLookup(song, `popular:${song.youtubeId}`, "This song is not currently available in YouTube search. Try searching for another version."), workingId === `popular:${song.youtubeId}`) : null}
      </li>)}</ol>
    </div>

    <div role="tabpanel" id="guest-panel-queue" aria-labelledby="guest-tab-queue" hidden={tab !== "queue"} className="pt-4">
      {queueState === "loading" ? <p role="status" className="text-sm text-muted-foreground">Loading queue…</p> : null}
      {queueState === "reconnecting" ? <p role="status" className="text-sm text-accent">Queue connection interrupted. Reconnecting…</p> : null}
      {queueState === "connected" && queue.items.length === 0 ? <p className="text-sm text-muted-foreground">No songs yet. Search above and add the first one.</p> : null}
      {queue.fairRotation ? <p className="mb-3 text-xs text-muted-foreground">Fair singer rotation is on.</p> : null}
      <ol className="space-y-2" data-testid="queue-list">{queue.items.map((item, index) => <li key={item.id} data-testid="queue-item" className="rounded-2xl border border-white/10 bg-white/5 p-2.5">
        <div className="flex items-center gap-3"><span className="w-6 shrink-0 text-center font-mono text-sm font-bold text-accent">{index + 1}</span><SongThumbnail youtubeId={item.youtubeId} className="w-20" /><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{singerLabel(item)}{item.requestedBy === guestId ? " · you" : ""}</p></div></div>
        {canManageQueue ? <div className="mt-2 flex flex-wrap gap-2 border-t border-white/10 pt-2">
          <button type="button" aria-label={`Move ${item.title} up`} disabled={index === 0 || workingId !== null} onClick={() => void change(item.id, "up")} className="queue-action">Up</button>
          <button type="button" aria-label={`Move ${item.title} down`} disabled={index === queue.items.length - 1 || workingId !== null} onClick={() => void change(item.id, "down")} className="queue-action">Down</button>
          <button type="button" aria-label={`Skip ${item.title}`} disabled={workingId !== null} onClick={() => void change(item.id, "skip")} className="queue-action">Skip</button>
          <button type="button" aria-label={`Remove ${item.title}`} disabled={workingId !== null} onClick={() => void change(item.id, "remove")} className="queue-action">Remove</button>
        </div> : null}
      </li>)}</ol>
    </div>

    <div role="tabpanel" id="guest-panel-stage" aria-labelledby="guest-tab-stage" hidden={tab !== "stage"} className="space-y-5 pt-4">
      {stage}
      {queueState === "connected" ? <p className="text-xs text-muted-foreground">Party theme: The host selected {getPartyTheme(queue.partyTheme).label}.</p> : null}
      {people}
    </div>

    <div role="tabpanel" id="guest-panel-scores" aria-labelledby="guest-tab-scores" hidden={tab !== "scores"} className="pt-4">{scores}</div>

    <div role="tabpanel" id="guest-panel-mine" aria-labelledby="guest-tab-mine" hidden={tab !== "mine"} className="pt-4">
      {current?.requestedBy === guestId ? <p className="mb-3 rounded-2xl border border-primary/50 bg-primary/15 p-3 text-sm font-semibold text-white">Your song is on stage now. Open Stage for your microphone.</p> : null}
      {mine.length === 0 ? <p className="text-sm text-muted-foreground">You have no songs waiting. Search above to add one.</p> : <ul className="space-y-2" data-testid="my-songs">{mine.map((item) => {
        const ahead = queue.items.findIndex((entry) => entry.id === item.id);
        return <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2.5"><SongThumbnail youtubeId={item.youtubeId} className="w-20" /><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{singerLabel(item)} · {ahead === 0 ? "next up" : `${ahead} ${ahead === 1 ? "song" : "songs"} ahead`}</p></div></li>;
      })}</ul>}
    </div>

    <div role="tabpanel" id="guest-panel-favorites" aria-labelledby="guest-tab-favorites" hidden={tab !== "favorites"} className="pt-4" data-testid="song-favorites">
      <p className="text-xs text-muted-foreground">Saved only on this device. Availability is rechecked on YouTube before adding.</p>
      {favorites.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Tap the heart on a search result to save it here.</p> : <ul className="mt-3 space-y-2">{favorites.map((favorite) => <li key={favorite.youtubeId} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2.5">
        <SongThumbnail youtubeId={favorite.youtubeId} className="w-20" />
        <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold text-white">{favorite.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{favorite.channelTitle} · {formatDuration(favorite.durationSeconds)}</p></div>
        <button type="button" aria-label={`Remove ${favorite.title} from favorites`} onClick={() => toggleFavorite(favorite)} className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-white"><X className="size-5" aria-hidden="true" /></button>
        {canAddSongs ? addButton(`Add ${favorite.title}`, () => void addFavorite(favorite), workingId === `favorite:${favorite.youtubeId}`) : null}
      </li>)}</ul>}
    </div>

    {reactionsEnabled || current ? <ReactionButton code={code} enabled={reactionsEnabled} /> : null}
  </div>;
}
