"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { Maximize2, Mic2, Minimize2, Music2, Play, Plus, Search } from "lucide-react";
import { parseRoomReactionEvent, reactionEmoji, type RoomReactionEvent } from "@/lib/reactions/rules";
import type { PlaybackSnapshot, PlaybackSong, TvPlayerEvent } from "@/lib/playback/state";
import { applyPartyTheme, restorePersonalPartyTheme } from "@/lib/themes/client";
import { singerLabel } from "@/lib/songs/singers";
import { youtubeThumbnailUrl } from "@/lib/songs/thumbnail";
import type { SongResult } from "@/lib/songs/youtube";
import { RoomScores } from "@/components/room-scores";
import { PartyNotificationToasts } from "@/components/party-notification-toasts";
import { parsePartyNotification, type PartyNotification } from "@/lib/rooms/notification-rules";
import {
  shouldShowTvSongStartNotice,
  SINGER_COUNTDOWN_SECONDS,
  TV_START_NOTICE_MS,
  tvQueuePreview,
} from "@/lib/tv/remote-rules";
import { useTvRemoteNavigation } from "@/lib/tv/use-tv-remote-navigation";

type Player = { playVideo(): void; pauseVideo(): void; destroy(): void };
type TvRailTab = "queue" | "scores" | "search";
type TvStartNotice = { title: string; singer: string };
type TvSearchState = { status: "idle" | "loading" | "results" | "empty" | "error"; songs: SongResult[]; message?: string };
type PlayerEvent = { data: number };
type PlayerApi = { Player: new (element: HTMLElement, options: {
  videoId: string; width: string; height: string; playerVars: { controls: number; playsinline: number; origin: string };
  events: { onReady: () => void; onStateChange: (event: PlayerEvent) => void; onError: (event: PlayerEvent) => void; onAutoplayBlocked: () => void };
}) => Player };
type YtWindow = Window & { YT?: PlayerApi; onYouTubeIframeAPIReady?: () => void };
let playerApiPromise: Promise<PlayerApi> | null = null;
const TV_RAIL_TABS: readonly { id: TvRailTab; label: string }[] = [
  { id: "queue", label: "Up next" },
  { id: "scores", label: "Scores" },
  { id: "search", label: "Search" },
];

function TvStageBanner({ code, notice }: { code: string; notice: TvStartNotice | null }) {
  if (notice) {
    return (
      <div className="tv-stage-start-notice flex min-h-12 min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-[#ff8d76]/35 bg-[#24131c]/95 px-4 py-2 text-left shadow-[0_12px_35px_rgba(0,0,0,.24)]" role="status" aria-live="polite" data-testid="tv-song-start-notice">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#d92362] text-white"><Play className="ml-0.5 size-4" aria-hidden="true" /></span>
        <span className="min-w-0">
          <span className="block text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#ffc16f]">Now starting</span>
          <span className="block truncate text-sm font-black text-white">{notice.title} · {notice.singer}</span>
        </span>
      </div>
    );
  }

  const accessibleMessage = `Welcome to MyKaraoke. Scan the QR code or enter room ${code} on your phone to join and add songs.`;
  return (
    <div className="tv-stage-banner min-h-12 min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/45" role="region" aria-label={accessibleMessage} data-testid="tv-stage-banner">
      <div className="tv-stage-banner-track flex min-h-12 w-max items-center" aria-hidden="true">
        <span>🎤 Welcome to MyKaraoke! Scan the QR code or enter room <strong>{code}</strong> on your phone to join and add songs.</span>
        <span>🎤 Welcome to MyKaraoke! Scan the QR code or enter room <strong>{code}</strong> on your phone to join and add songs.</span>
      </div>
    </div>
  );
}

function duration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

async function responseError(response: Response): Promise<string> {
  try { return ((await response.json()) as { error?: string }).error ?? "Please try again."; }
  catch { return "Please try again."; }
}

function loadPlayerApi(): Promise<PlayerApi> {
  const browser = window as YtWindow;
  if (browser.YT?.Player) return Promise.resolve(browser.YT);
  if (!playerApiPromise) playerApiPromise = new Promise((resolve, reject) => {
    const previousReady = browser.onYouTubeIframeAPIReady;
    browser.onYouTubeIframeAPIReady = () => { previousReady?.(); if (browser.YT?.Player) resolve(browser.YT); else reject(new Error("YouTube player unavailable")); };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => { playerApiPromise = null; reject(new Error("YouTube player unavailable")); };
    document.head.appendChild(script);
  });
  return playerApiPromise;
}

function YoutubeStage({ song, desired, canActivate, autoActivate, onEvent }: { song: PlaybackSong; desired: PlaybackSnapshot["desired"]; canActivate: boolean; autoActivate: boolean; onEvent: (itemId: string, event: TvPlayerEvent, errorCode?: number) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const activatedRef = useRef(false);
  const desiredRef = useRef(desired);
  const [ready, setReady] = useState(false);
  const [activation, setActivation] = useState(false);
  const [loadError, setLoadError] = useState("");
  useEffect(() => { desiredRef.current = desired; }, [desired]);

  useEffect(() => {
    let mounted = true;
    const mount = mountRef.current;
    void loadPlayerApi().then((api) => {
      if (!mounted || !mount) return;
      const target = document.createElement("div");
      mount.appendChild(target);
      playerRef.current = new api.Player(target, {
        videoId: song.youtubeId, width: "100%", height: "100%",
        playerVars: { controls: 1, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: () => { if (mounted) { setReady(true); if (activatedRef.current && desiredRef.current === "play") playerRef.current?.playVideo(); } },
          onStateChange: (event) => {
            if (!mounted) return;
            if (event.data === 0) onEvent(song.id, "ended");
            else if (event.data === 1) {
              if (desiredRef.current === "pause") playerRef.current?.pauseVideo();
              else onEvent(song.id, "playing");
            } else if (event.data === 2) onEvent(song.id, "paused");
          },
          onError: (event) => { if (mounted) onEvent(song.id, "error", event.data); },
          onAutoplayBlocked: () => { if (mounted) { activatedRef.current = false; setActivation(false); onEvent(song.id, "blocked"); } },
        },
      });
    }).catch(() => { if (mounted) { setLoadError("YouTube could not load. Ask the host to skip this song or try again."); onEvent(song.id, "error", 0); } });
    return () => { mounted = false; playerRef.current?.destroy(); playerRef.current = null; mount?.replaceChildren(); };
  }, [song.id, song.youtubeId, onEvent]);

  useEffect(() => {
    if (!ready || !activatedRef.current) return;
    if (desired === "pause") playerRef.current?.pauseVideo();
    else playerRef.current?.playVideo();
  }, [desired, ready]);

  useEffect(() => {
    if (!autoActivate || !canActivate || !ready || activatedRef.current) return;
    activatedRef.current = true;
    setActivation(true);
    if (desired === "play") playerRef.current?.playVideo();
  }, [autoActivate, canActivate, desired, ready]);

  function activate() {
    if (!canActivate) return;
    activatedRef.current = true;
    setActivation(true);
    if (desired === "play") playerRef.current?.playVideo();
  }

  return <div>
    <div className="aspect-video min-h-[240px] w-full overflow-hidden rounded-2xl border border-white/15 bg-black" data-testid="tv-player"><div ref={mountRef} className="h-full w-full" /></div>
    {!activation || !ready ? <button type="button" onClick={activate} disabled={!canActivate} data-tv-focus className="mt-5 flex min-h-14 items-center gap-2 rounded-xl bg-[#d92362] px-6 py-3 font-bold text-white outline-none focus-visible:ring-4 focus-visible:ring-[#ffc16f] disabled:cursor-wait disabled:opacity-60"><Play className="size-5" aria-hidden="true" />{!canActivate ? "Singer getting ready" : ready ? "Start video" : "Enable YouTube player"}</button> : null}
    {activation ? <p className="mt-3 text-sm text-muted-foreground">If your browser blocks playback, press Play inside the YouTube player.</p> : null}
    {loadError ? <p role="alert" className="mt-3 text-sm text-[#ffb0a2]">{loadError}</p> : null}
  </div>;
}

function SingerStage({ song, desired, autoActivate, onEvent }: { song: PlaybackSong; desired: PlaybackSnapshot["desired"]; autoActivate: boolean; onEvent: (itemId: string, event: TvPlayerEvent, errorCode?: number) => void }) {
  const [remaining, setRemaining] = useState(SINGER_COUNTDOWN_SECONDS);

  useEffect(() => {
    const deadline = Date.now() + SINGER_COUNTDOWN_SECONDS * 1_000;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)));
    const timer = window.setInterval(tick, 200);
    tick();
    return () => window.clearInterval(timer);
  }, [song.id]);

  return (
    <div className="relative">
      <YoutubeStage song={song} desired={desired} canActivate={remaining === 0} autoActivate={autoActivate} onEvent={onEvent} />
      {remaining > 0 ? (
        <div className="absolute inset-x-0 top-0 z-10 grid aspect-video min-h-[240px] place-items-center rounded-2xl border border-[#ffad69]/40 bg-[#0b0d16]/95 p-8 text-center" role="status" aria-live="polite" data-testid="singer-countdown">
          <div>
            <p className="eyebrow">Coming to the stage</p>
            <p className="mt-5 text-[clamp(2rem,5vw,4.75rem)] leading-none font-black tracking-[-0.05em] text-white">{singerLabel(song)}</p>
            <p className="mt-6 font-mono text-[clamp(4rem,9vw,8rem)] leading-none font-black text-[#ffc16f]" aria-label={`Starting in ${remaining}`}>{remaining}</p>
            <p className="mt-5 text-lg text-[#d8c8cf]">Get ready—your song is next.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WaitingStage({ code, qrDataUrl }: { code: string; qrDataUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncPlaybackPreference() {
      const video = videoRef.current;
      if (!video) return;

      if (reducedMotion.matches) {
        video.pause();
        if (video.readyState > 0) video.currentTime = 0;
        return;
      }

      void video.play().catch(() => {
        // The existing gradient remains visible when a browser declines autoplay.
      });
    }

    syncPlaybackPreference();
    if (typeof reducedMotion.addEventListener === "function") {
      reducedMotion.addEventListener("change", syncPlaybackPreference);
      return () => reducedMotion.removeEventListener("change", syncPlaybackPreference);
    }

    reducedMotion.addListener(syncPlaybackPreference);
    return () => reducedMotion.removeListener(syncPlaybackPreference);
  }, []);

  return (
    <section className="entry-illustration tv-waiting-stage relative grid min-h-[32rem] place-items-center overflow-hidden p-6 sm:p-10 xl:h-full" aria-labelledby="tv-waiting-title" data-testid="tv-waiting-stage">
      <video ref={videoRef} muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} data-testid="tv-waiting-video" className="tv-waiting-video motion-reduce:hidden">
        <source src="/media/tv-videoke-family-loop.mp4" type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(7,8,14,.34),rgba(7,8,14,.68)),radial-gradient(circle_at_50%_42%,transparent_0%,rgba(7,8,14,.4)_72%)]" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-3xl rounded-[2rem] border border-white/20 bg-[#0b0d16]/35 p-7 text-center shadow-[0_30px_90px_rgba(0,0,0,.38)] backdrop-blur-[3px] sm:p-10" data-testid="tv-waiting-card">
        <p className="eyebrow">The room is open</p>
        <h1 id="tv-waiting-title" className="mt-4 text-[clamp(2.5rem,5vw,5rem)] leading-[0.94] font-black tracking-[-0.055em]">Waiting for songs…</h1>
        <p className="mx-auto mt-5 max-w-2xl text-[clamp(1rem,1.6vw,1.35rem)] leading-8 text-[#d8c8cf]">Scan the QR code or enter room <strong className="font-mono tracking-[0.14em] text-[#ffc16f]">{code}</strong> on your phone to join and add songs.</p>
        <div className="mx-auto mt-7 w-fit rounded-[1.5rem] bg-[#fff2e5] p-3 shadow-[0_20px_60px_rgba(0,0,0,.4)]">
          <Image src={qrDataUrl} alt={`QR code to join room ${code}`} width={320} height={320} unoptimized className="size-48 rounded-xl sm:size-56" />
        </div>
      </div>
    </section>
  );
}

function TvQueuePanel({ state }: { state: PlaybackSnapshot }) {
  const queue = tvQueuePreview(state.upNext, state.queuedCount);

  return (
    <section aria-labelledby="tv-queue-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="tv-queue-title" className="text-sm font-black text-white">Upcoming singers</h2>
        <p className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-mono text-xs text-[#ffc16f]">{state.queuedCount} {state.queuedCount === 1 ? "song" : "songs"}</p>
      </div>
      {queue.visible.length > 0 ? (
        <ol className="mt-4 space-y-2" data-testid="tv-queue">
          {queue.visible.map((item, index) => (
            <li key={item.id} className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3" data-testid="tv-queue-item">
              <span className="grid size-8 place-items-center rounded-lg bg-white/5 font-mono text-sm font-black text-[#ffc16f]">{index + 1}</span>
              <div className="min-w-0">
                <p className="break-words text-sm leading-5 font-bold text-white [overflow-wrap:anywhere]">{item.title}</p>
                <p className="mt-1 break-words text-xs leading-4 text-muted-foreground [overflow-wrap:anywhere]">{singerLabel(item)} · {duration(item.durationSeconds)}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : <div className="grid min-h-52 place-items-center text-center"><div><Music2 className="mx-auto size-10 text-white/20" aria-hidden="true" /><p className="mt-4 text-sm font-semibold text-muted-foreground">The queue is empty.</p><p className="mt-1 text-xs text-muted-foreground">Waiting for singers!</p></div></div>}
      {queue.hiddenCount > 0 ? <p className="mt-3 text-xs font-semibold text-[#ffe4cd]">+{queue.hiddenCount} more in the queue</p> : null}
    </section>
  );
}

function TvSearchThumbnail({ youtubeId }: { youtubeId: string }) {
  const [failed, setFailed] = useState(false);
  const src = youtubeThumbnailUrl(youtubeId);
  return <span className="grid aspect-video w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10">
    {src && !failed
      ? <Image src={src} alt="" width={320} height={180} unoptimized loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      : <Music2 className="size-5 text-[#ffc16f]" aria-hidden="true" />}
  </span>;
}

function TvSearchPanel({ code }: { code: string }) {
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<TvSearchState>({ status: "idle", songs: [] });

  async function searchSongs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchState.status === "loading") return;
    setSearchState({ status: "loading", songs: [] });
    try {
      const response = await fetch(`/api/rooms/${code}/playback/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      if (!response.ok) {
        setSearchState({ status: "error", songs: [], message: await responseError(response) });
        return;
      }
      const songs = ((await response.json()) as { songs?: SongResult[] }).songs ?? [];
      setSearchState({ status: songs.length > 0 ? "results" : "empty", songs });
    } catch {
      setSearchState({ status: "error", songs: [], message: "Search is unavailable. Check the TV connection and try again." });
    }
  }

  return <section aria-labelledby="tv-search-title">
    <h2 id="tv-search-title" className="sr-only">Search songs</h2>
    <form onSubmit={(event) => void searchSongs(event)}>
      <label htmlFor="tv-song-search" className="sr-only">Search songs or artists</label>
      <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input id="tv-song-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={80} required placeholder="Search songs or artists" data-tv-focus className="h-13 w-full rounded-2xl border border-white/15 bg-black/20 pr-4 pl-12 text-sm text-white outline-none placeholder:text-muted-foreground focus-visible:border-[#ffad69] focus-visible:ring-4 focus-visible:ring-[#ffad69]/30" /></div>
      <button type="submit" disabled={searchState.status === "loading" || query.trim().length < 2} data-tv-focus className="mt-3 min-h-12 w-full rounded-2xl bg-[#d92362] px-4 py-3 text-sm font-black text-white outline-none focus-visible:ring-4 focus-visible:ring-[#ffc16f] disabled:opacity-50">{searchState.status === "loading" ? "Searching…" : "Search"}</button>
    </form>
    <p id="tv-search-phone-help" className="mt-4 text-xs leading-5 text-muted-foreground">Search on this display, then scan the room QR to add a result from your phone.</p>
    {searchState.status === "idle" ? <div className="grid min-h-36 place-items-center text-center"><p className="max-w-xs text-sm text-muted-foreground">Find a karaoke song or artist for the party.</p></div> : null}
    {searchState.status === "empty" ? <p role="status" className="mt-5 text-sm text-muted-foreground">No supported results found. Try another title or artist.</p> : null}
    {searchState.status === "error" ? <p role="alert" className="mt-5 text-sm text-[#ffb0a2]">{searchState.message}</p> : null}
    {searchState.status === "results" ? <ul className="mt-5 space-y-3" data-testid="tv-search-results">{searchState.songs.map((song) => <li key={song.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"><TvSearchThumbnail youtubeId={song.youtubeId} /><div className="min-w-0 flex-1"><p className="line-clamp-2 break-words text-sm font-bold text-white [overflow-wrap:anywhere]">{song.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{song.channelTitle} · {duration(song.durationSeconds)}</p></div><button type="button" disabled aria-label={`Add ${song.title} from a joined phone`} aria-describedby="tv-search-phone-help" title="Scan the QR and add this song from your phone." className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d92362] text-white disabled:cursor-not-allowed disabled:opacity-60"><Plus className="size-5" aria-hidden="true" /></button></li>)}</ul> : null}
  </section>;
}

function TvJoinCard({ code, qrDataUrl }: { code: string; qrDataUrl: string }) {
  return <section className="mt-5 grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-4 border-t border-white/10 pt-5" aria-labelledby="tv-join-title" data-testid="tv-join-card">
    <div className="rounded-xl bg-[#fff2e5] p-2"><Image src={qrDataUrl} alt={`Compact QR code to join room ${code}`} width={160} height={160} unoptimized className="size-full rounded-lg" /></div>
    <div className="min-w-0"><p id="tv-join-title" className="text-xs font-black uppercase tracking-[0.13em] text-[#ffad69]">Join the party</p><p className="mt-1 font-mono text-[clamp(1.65rem,2.5vw,2.5rem)] leading-none font-black tracking-[0.12em] text-white">{code}</p><p className="mt-2 text-xs leading-4 text-muted-foreground">Scan or enter the code on your phone to add songs.</p></div>
  </section>;
}

function TvUtilityRail({ code, qrDataUrl, state }: { code: string; qrDataUrl: string; state: PlaybackSnapshot }) {
  const [tab, setTab] = useState<TvRailTab>("queue");
  return <aside className="flex min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#111219]/95 shadow-[0_24px_70px_rgba(0,0,0,.22)]" aria-label="TV party information" data-testid="tv-utility-rail">
    <div className="grid grid-cols-3 border-b border-white/10" role="tablist" aria-label="Party information">
      {TV_RAIL_TABS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} aria-controls="tv-party-panel" id={`tv-tab-${item.id}`} onClick={() => setTab(item.id)} data-tv-focus className={`min-h-16 border-b-2 px-2 text-sm font-black outline-none transition focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#ffc16f] ${tab === item.id ? "border-[#ff6e8f] text-[#ffc16f]" : "border-transparent text-muted-foreground hover:text-white"}`}>{item.label}</button>)}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6" role="tabpanel" id="tv-party-panel" aria-labelledby={`tv-tab-${tab}`} tabIndex={0}>
      {tab === "queue" ? <TvQueuePanel state={state} /> : tab === "scores" ? <RoomScores code={code} variant="tv" /> : <TvSearchPanel code={code} />}
    </div>
    <div className="px-5 pb-5 sm:px-6 sm:pb-6"><TvJoinCard code={code} qrDataUrl={qrDataUrl} /></div>
  </aside>;
}

function NowPlayingSummary({ state }: { state: PlaybackSnapshot }) {
  if (!state.current) return null;
  return <section className="mt-4 min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] p-5" aria-labelledby="tv-now-playing-title">
    <p className="eyebrow">On stage</p>
    <h1 id="tv-now-playing-title" className="mt-3 break-words text-[clamp(1.25rem,1.65vw,2rem)] leading-[1.08] font-black tracking-[-0.025em] [overflow-wrap:anywhere]" data-testid="tv-now-playing-title">{state.current.title}</h1>
    <div className="mt-3 flex flex-wrap items-center gap-3"><p className="break-words text-[clamp(1rem,1.35vw,1.35rem)] font-bold text-[#ffe4cd] [overflow-wrap:anywhere]">{singerLabel(state.current)}</p><p className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-muted-foreground">Player state: {state.observed}</p></div>
    {state.observed === "blocked" ? <p role="alert" className="mt-3 text-sm leading-6 text-[#ffc16f]">Playback was blocked. Press Play in the YouTube player on this display.</p> : null}
    {state.observed === "error" ? <p role="alert" className="mt-3 text-sm leading-6 text-[#ffb0a2]">YouTube could not play this video (error {state.errorCode ?? "unknown"}). Ask the host to skip it.</p> : null}
  </section>;
}

export function TvStage({ code, qrDataUrl }: { code: string; qrDataUrl: string }) {
  const router = useRouter();
  const [state, setState] = useState<PlaybackSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [ended, setEnded] = useState(false);
  const [reactions, setReactions] = useState<RoomReactionEvent[]>([]);
  const [partyNotifications, setPartyNotifications] = useState<PartyNotification[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [startNotice, setStartNotice] = useState<TvStartNotice | null>(null);
  const [autoActivate] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.sessionStorage.getItem(`mykaraoke:tv-autoplay:${code}`) === "1"; }
    catch { return false; }
  });
  const endedRef = useRef(false);
  const reactionTimers = useRef(new Map<string, number>());
  const notificationTimers = useRef(new Map<string, number>());
  const observedCurrentRef = useRef<{ initialized: boolean; id: string | null }>({ initialized: false, id: null });
  const startNoticeTimerRef = useRef<number | undefined>(undefined);
  const handleRemoteBack = useCallback(() => {
    if (!document.fullscreenElement) return false;
    void document.exitFullscreen();
    return true;
  }, []);
  useTvRemoteNavigation({
    onBack: handleRemoteBack,
  });
  const onEvent = useCallback((itemId: string, event: TvPlayerEvent, errorCode?: number) => {
    void fetch(`/api/rooms/${code}/playback/event`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, event, errorCode }),
    }).then(async (response) => {
      if (response.ok) { const snapshot = await response.json() as PlaybackSnapshot; if (!endedRef.current) setState((current) => !current || snapshot.version >= current.version ? snapshot : current); }
      else if (response.status === 410) { endedRef.current = true; setState(null); setEnded(true); }
      else setMessage("Player state could not be saved. Check your connection.");
    }).catch(() => setMessage("Player state could not be saved. Check your connection."));
  }, [code]);

  const roomTheme = state?.partyTheme;
  const hasPlaybackState = state !== null;
  const currentSongId = state?.current?.id ?? null;
  const currentSongTitle = state?.current?.title ?? "";
  const currentSinger = state?.current ? singerLabel(state.current) : "";
  useEffect(() => {
    if (roomTheme) applyPartyTheme(roomTheme);
  }, [roomTheme]);

  useEffect(() => {
    if (!hasPlaybackState) return;
    const observed = observedCurrentRef.current;
    if (!observed.initialized) {
      observed.initialized = true;
      observed.id = currentSongId;
      return;
    }

    const previousCurrentId = observed.id;
    observed.id = currentSongId;
    if (currentSongId === null || !shouldShowTvSongStartNotice(previousCurrentId, currentSongId)) return;

    setStartNotice({ title: currentSongTitle, singer: currentSinger });
    if (startNoticeTimerRef.current !== undefined) window.clearTimeout(startNoticeTimerRef.current);
    startNoticeTimerRef.current = window.setTimeout(() => {
      startNoticeTimerRef.current = undefined;
      setStartNotice(null);
    }, TV_START_NOTICE_MS);
  }, [currentSinger, currentSongId, currentSongTitle, hasPlaybackState]);

  useEffect(() => () => restorePersonalPartyTheme(), []);

  useEffect(() => () => {
    if (startNoticeTimerRef.current !== undefined) window.clearTimeout(startNoticeTimerRef.current);
  }, []);

  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setMessage("This browser did not allow fullscreen. Use the TV browser's fullscreen control instead.");
    }
  }

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (endedRef.current) return;
      try {
        const response = await fetch(`/api/rooms/${code}/playback`, { cache: "no-store" });
        if (response.status === 403) { if (active) { setState(null); router.refresh(); } return; }
        if (response.status === 410) { if (active) { endedRef.current = true; setState(null); setEnded(true); setMessage(""); } return; }
        if (!response.ok) throw new Error("Playback unavailable");
        const snapshot = await response.json() as PlaybackSnapshot;
        if (active && !endedRef.current) { setState((current) => !current || snapshot.version >= current.version ? snapshot : current); setMessage(""); }
      } catch { if (active && !endedRef.current) setMessage("Connection interrupted. Reconnecting…"); }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 2_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [code, router]);

  useEffect(() => {
    let active = true;
    let client: SupabaseClient | undefined;
    let channel: RealtimeChannel | undefined;
    let retryTimer: number | undefined;
    let retryCount = 0;

    function showReaction(value: unknown) {
      const event = parseRoomReactionEvent(value);
      if (!event || endedRef.current) return;
      setReactions((current) => current.some((item) => item.id === event.id) ? current : [...current.slice(-5), event]);
      const existing = reactionTimers.current.get(event.id);
      if (existing) window.clearTimeout(existing);
      const timer = window.setTimeout(() => {
        reactionTimers.current.delete(event.id);
        setReactions((current) => current.filter((item) => item.id !== event.id));
      }, 3_500);
      reactionTimers.current.set(event.id, timer);
    }

    function showPartyNotification(value: unknown) {
      const event = parsePartyNotification(value);
      if (!event || endedRef.current) return;
      setPartyNotifications((current) => current.some((item) => item.id === event.id) ? current : [...current.slice(-2), event]);
      const existing = notificationTimers.current.get(event.id);
      if (existing) window.clearTimeout(existing);
      notificationTimers.current.set(event.id, window.setTimeout(() => {
        notificationTimers.current.delete(event.id);
        setPartyNotifications((current) => current.filter((item) => item.id !== event.id));
      }, 4_500));
    }

    function scheduleRetry() {
      if (!active || endedRef.current || retryTimer !== undefined) return;
      const delay = Math.min(30_000, 1_000 * 2 ** Math.min(retryCount++, 5));
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        void subscribe();
      }, delay);
    }

    async function subscribe() {
      if (!active || endedRef.current || channel) return;
      try {
        const response = await fetch(`/api/rooms/${code}/queue/realtime`, { cache: "no-store" });
        if (!response.ok) throw new Error("Realtime configuration unavailable");
        const config = await response.json() as { enabled: boolean; url?: string; key?: string; topic?: string };
        if (!active || !config.enabled || !config.url || !config.key || !config.topic) return;
        const nextClient = createClient(config.url, config.key, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: `mk-tv-${code}-${crypto.randomUUID()}` },
        });
        await nextClient.realtime.setAuth(config.key);
        if (!active || endedRef.current) {
          void nextClient.realtime.disconnect();
          return;
        }
        const nextChannel = nextClient.channel(config.topic, { config: { private: true } })
          .on("broadcast", { event: "reaction" }, (message) => showReaction(message.payload))
          .on("broadcast", { event: "party_notification" }, (message) => showPartyNotification(message.payload))
          .subscribe((status) => {
            if (status === "SUBSCRIBED") retryCount = 0;
            else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status) && channel === nextChannel) {
              channel = undefined;
              client = undefined;
              void nextClient.removeChannel(nextChannel);
              void nextClient.realtime.disconnect();
              scheduleRetry();
            }
          });
        client = nextClient;
        channel = nextChannel;
      } catch {
        scheduleRetry();
      }
    }

    void subscribe();
    const online = () => { if (!channel) { if (retryTimer) window.clearTimeout(retryTimer); retryTimer = undefined; void subscribe(); } };
    window.addEventListener("online", online);
    const timers = reactionTimers.current;
    const noticeTimers = notificationTimers.current;
    return () => {
      active = false;
      if (retryTimer) window.clearTimeout(retryTimer);
      window.removeEventListener("online", online);
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
      for (const timer of noticeTimers.values()) window.clearTimeout(timer);
      noticeTimers.clear();
      if (client && channel) { void client.removeChannel(channel); void client.realtime.disconnect(); }
    };
  }, [code]);

  return <main className="mx-auto flex min-h-screen max-w-[120rem] flex-col px-5 py-5 sm:px-8 lg:px-10">
    <PartyNotificationToasts events={partyNotifications} />
    <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pb-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-4" data-testid="tv-stage-header">
      <Image src="/brand/mykaraoke-wordmark.png" alt="MyKaraoke" width={2172} height={724} className="h-auto w-36 rounded-xl bg-[#fff2e5] p-2 object-contain sm:w-44 md:w-56" priority data-testid="tv-stage-logo" />
      <div className="col-span-2 min-w-0 md:col-span-1"><TvStageBanner code={code} notice={startNotice} /></div>
      <div className="row-start-1 flex items-center justify-self-end gap-2 sm:gap-3 md:col-start-3" data-testid="tv-stage-controls">
        <button type="button" disabled aria-label="Microphone controls stay on the host device" title="Microphone controls stay on the host device." className="flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-bold text-muted-foreground disabled:opacity-70 sm:px-4"><Mic2 className="size-5" aria-hidden="true" /><span className="hidden sm:inline">Mic on host</span></button>
        <button type="button" onClick={() => void toggleFullscreen()} data-tv-focus className="grid size-12 place-items-center rounded-2xl border border-white/15 bg-white/5 text-white outline-none transition hover:bg-white/10 focus-visible:border-[#ffad69] focus-visible:ring-4 focus-visible:ring-[#ffad69]/40" aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{fullscreen ? <Minimize2 className="size-5" aria-hidden="true" /> : <Maximize2 className="size-5" aria-hidden="true" />}</button>
      </div>
    </header>
    {ended ? <div className="grid flex-1 place-items-center py-12 text-center"><div><p className="eyebrow">Session finished</p><p role="alert" className="mt-5 text-3xl font-black text-[#ffb0a2]">This room ended or expired.</p><p className="mt-3 text-muted-foreground">Playback has stopped. Ask the host for a new room.</p></div></div> : null}
    {!state && !ended ? <div className="grid flex-1 place-items-center py-12"><p role="status" className="flex items-center gap-3 text-lg text-muted-foreground"><span className="size-3 animate-pulse rounded-full bg-primary" aria-hidden="true" />Connecting to the room…</p></div> : null}
    {state && !ended ? <div className="grid min-w-0 flex-1 items-stretch gap-5 pb-5 xl:grid-cols-[minmax(0,1.72fr)_minmax(22rem,0.62fr)]">
      <div className="relative min-w-0" data-testid="tv-stage-column">{state.current ? <div className="rounded-[1.75rem] border border-white/10 bg-[#111219]/80 p-4 shadow-[0_24px_70px_rgba(0,0,0,.22)] sm:p-5"><SingerStage key={state.current.id} song={state.current} desired={state.desired} autoActivate={autoActivate} onEvent={onEvent} /><NowPlayingSummary state={state} /></div> : <WaitingStage code={code} qrDataUrl={qrDataUrl} />}
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 h-40 overflow-hidden" aria-live="polite" aria-label="Party reactions">
          {reactions.map((reaction, index) => <div key={reaction.id} className="tv-reaction absolute bottom-0 rounded-2xl border border-white/20 bg-[#17101d]/90 px-4 py-2 shadow-2xl motion-reduce:animate-none" style={{ left: `${8 + ((index * 17) % 72)}%` }}><span className="text-4xl" aria-hidden="true">{reactionEmoji(reaction.reaction)}</span><span className="ml-2 text-sm font-bold text-white">{reaction.sender}</span></div>)}
        </div>
      </div>
      <TvUtilityRail code={code} qrDataUrl={qrDataUrl} state={state} />
    </div> : null}
    {message ? <p role="status" className="pb-4 text-sm text-[#ffc16f]">{message}</p> : null}
  </main>;
}
