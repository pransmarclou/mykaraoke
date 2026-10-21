"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { Maximize2, Minimize2, Play, Radio } from "lucide-react";
import { parseRoomReactionEvent, reactionEmoji, type RoomReactionEvent } from "@/lib/reactions/rules";
import type { PlaybackSnapshot, PlaybackSong, TvPlayerEvent } from "@/lib/playback/state";
import { applyPartyTheme, restorePersonalPartyTheme } from "@/lib/themes/client";
import { singerLabel } from "@/lib/songs/singers";
import { RoomScores } from "@/components/room-scores";
import { SINGER_COUNTDOWN_SECONDS } from "@/lib/tv/remote-rules";
import { useTvRemoteNavigation } from "@/lib/tv/use-tv-remote-navigation";

type Player = { playVideo(): void; pauseVideo(): void; destroy(): void };
type PlayerEvent = { data: number };
type PlayerApi = { Player: new (element: HTMLElement, options: {
  videoId: string; width: string; height: string; playerVars: { controls: number; playsinline: number; origin: string };
  events: { onReady: () => void; onStateChange: (event: PlayerEvent) => void; onError: (event: PlayerEvent) => void; onAutoplayBlocked: () => void };
}) => Player };
type YtWindow = Window & { YT?: PlayerApi; onYouTubeIframeAPIReady?: () => void };
let playerApiPromise: Promise<PlayerApi> | null = null;

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

function YoutubeStage({ song, desired, canActivate, onEvent }: { song: PlaybackSong; desired: PlaybackSnapshot["desired"]; canActivate: boolean; onEvent: (itemId: string, event: TvPlayerEvent, errorCode?: number) => void }) {
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
          onAutoplayBlocked: () => { if (mounted) onEvent(song.id, "blocked"); },
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

function SingerStage({ song, desired, onEvent }: { song: PlaybackSong; desired: PlaybackSnapshot["desired"]; onEvent: (itemId: string, event: TvPlayerEvent, errorCode?: number) => void }) {
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
      <YoutubeStage song={song} desired={desired} canActivate={remaining === 0} onEvent={onEvent} />
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
  return (
    <section className="entry-illustration relative grid min-h-[32rem] overflow-hidden p-8 sm:p-12" aria-labelledby="tv-waiting-title" data-testid="tv-waiting-stage">
      <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <Image src="/brand/mykaraoke-wordmark.png" alt="" width={2172} height={724} className="h-auto w-full max-w-sm rounded-2xl bg-[#fff2e5] p-3 object-contain" priority />
          <p className="eyebrow mt-10">The room is open</p>
          <h1 id="tv-waiting-title" className="mt-4 max-w-2xl text-[clamp(3rem,6vw,6rem)] leading-[0.92] font-black tracking-[-0.065em]">Waiting for the next song</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#d8c8cf]">Scan the QR code or enter the room code on a phone to join the party and add a song.</p>
          <p className="mt-6 font-mono text-[clamp(2.5rem,5vw,4.75rem)] leading-none font-black tracking-[0.16em] text-white">{code}</p>
        </div>
        <div className="justify-self-center text-center">
          <div className="rounded-[1.5rem] bg-[#fff2e5] p-4 shadow-[0_26px_80px_rgba(0,0,0,.4)]">
            <Image src={qrDataUrl} alt={`QR code to join room ${code}`} width={320} height={320} unoptimized className="size-56 rounded-xl xl:size-64" />
          </div>
          <p className="mt-4 text-sm font-bold text-[#ffe4cd]">Scan to join from your phone</p>
        </div>
      </div>
    </section>
  );
}

export function TvStage({ code, qrDataUrl }: { code: string; qrDataUrl: string }) {
  const router = useRouter();
  const [state, setState] = useState<PlaybackSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [ended, setEnded] = useState(false);
  const [reactions, setReactions] = useState<RoomReactionEvent[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const endedRef = useRef(false);
  const reactionTimers = useRef(new Map<string, number>());
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
  useEffect(() => {
    if (roomTheme) applyPartyTheme(roomTheme);
  }, [roomTheme]);

  useEffect(() => () => restorePersonalPartyTheme(), []);

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
    return () => {
      active = false;
      if (retryTimer) window.clearTimeout(retryTimer);
      window.removeEventListener("online", online);
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
      if (client && channel) { void client.removeChannel(channel); void client.realtime.disconnect(); }
    };
  }, [code]);

  return <main className="mx-auto flex min-h-screen max-w-[100rem] flex-col px-5 py-5 sm:px-8 lg:px-10">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
      <Image src="/brand/mykaraoke-wordmark.png" alt="MyKaraoke" width={2172} height={724} className="h-auto w-44 rounded-xl bg-[#fff2e5] p-2 object-contain sm:w-56" priority />
      <div className="flex items-center gap-2 sm:gap-3">
        <p className="flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 font-mono text-xs font-bold tracking-[0.14em] text-[#ffc16f] sm:text-sm"><Radio className="size-4" aria-hidden="true" />ROOM {code}</p>
        <button type="button" onClick={() => void toggleFullscreen()} data-tv-focus className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/5 text-white outline-none transition hover:bg-white/10 focus-visible:border-[#ffad69] focus-visible:ring-4 focus-visible:ring-[#ffad69]/40" aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{fullscreen ? <Minimize2 className="size-5" aria-hidden="true" /> : <Maximize2 className="size-5" aria-hidden="true" />}</button>
      </div>
    </header>
    {ended ? <div className="grid flex-1 place-items-center py-12 text-center"><div><p className="eyebrow">Session finished</p><p role="alert" className="mt-5 text-3xl font-black text-[#ffb0a2]">This room ended or expired.</p><p className="mt-3 text-muted-foreground">Playback has stopped. Ask the host for a new room.</p></div></div> : null}
    {!state && !ended ? <div className="grid flex-1 place-items-center py-12"><p role="status" className="flex items-center gap-3 text-lg text-muted-foreground"><span className="size-3 animate-pulse rounded-full bg-primary" aria-hidden="true" />Connecting to the room…</p></div> : null}
    {state && !ended ? <div className={`grid flex-1 items-center gap-7 py-7 ${state.current ? "xl:grid-cols-[minmax(0,1.72fr)_minmax(20rem,0.58fr)]" : ""}`}>
      <div className="relative">{state.current ? <SingerStage key={state.current.id} song={state.current} desired={state.desired} onEvent={onEvent} /> : <WaitingStage code={code} qrDataUrl={qrDataUrl} />}
        <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 h-40 overflow-hidden" aria-live="polite" aria-label="Party reactions">
          {reactions.map((reaction, index) => <div key={reaction.id} className="tv-reaction absolute bottom-0 rounded-2xl border border-white/20 bg-[#17101d]/90 px-4 py-2 shadow-2xl motion-reduce:animate-none" style={{ left: `${8 + ((index * 17) % 72)}%` }}><span className="text-4xl" aria-hidden="true">{reactionEmoji(reaction.reaction)}</span><span className="ml-2 text-sm font-bold text-white">{reaction.sender}</span></div>)}
        </div>
      </div>
      {state.current ? <aside className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_70px_rgba(0,0,0,.22)] lg:p-8" aria-live="polite"><p className="eyebrow">On stage</p><h1 className="mt-4 text-[clamp(2rem,3.4vw,4rem)] leading-[0.98] font-black tracking-[-0.045em]">{state.current.title}</h1><p className="mt-5 text-[clamp(1.25rem,2vw,2rem)] font-bold text-[#ffe4cd]">{singerLabel(state.current)}</p><p className="mt-6 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-muted-foreground">Player state: {state.observed}</p>{state.observed === "blocked" ? <p role="alert" className="mt-4 text-sm leading-6 text-[#ffc16f]">Playback was blocked. Press Play in the YouTube player on this display.</p> : null}{state.observed === "error" ? <p role="alert" className="mt-4 text-sm leading-6 text-[#ffb0a2]">YouTube could not play this video (error {state.errorCode ?? "unknown"}). Ask the host to skip it.</p> : null}{state.next ? <div className="mt-8 border-t border-white/10 pt-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Up next</p><p className="mt-3 text-lg font-bold">{state.next.title}</p><p className="mt-1 text-sm text-muted-foreground">{singerLabel(state.next)}</p></div> : null}<RoomScores code={code} variant="tv" /></aside> : null}
    </div> : null}
    {message ? <p role="status" className="pb-4 text-sm text-[#ffc16f]">{message}</p> : null}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 py-4 text-xs text-muted-foreground"><p>YouTube playback uses the official embedded player. This display never receives host controls.</p><p>TV remote: arrows move · Enter selects · Back exits fullscreen</p></div>
  </main>;
}
