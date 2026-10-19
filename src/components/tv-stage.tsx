"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import type { PlaybackSnapshot, PlaybackSong, TvPlayerEvent } from "@/lib/playback/state";

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

function YoutubeStage({ song, desired, onEvent }: { song: PlaybackSong; desired: PlaybackSnapshot["desired"]; onEvent: (itemId: string, event: TvPlayerEvent, errorCode?: number) => void }) {
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
    activatedRef.current = true;
    setActivation(true);
    if (desired === "play") playerRef.current?.playVideo();
  }

  return <div>
    <div className="aspect-video min-h-[240px] w-full overflow-hidden rounded-2xl border border-white/15 bg-black" data-testid="tv-player"><div ref={mountRef} className="h-full w-full" /></div>
    {!activation || !ready ? <button type="button" onClick={activate} className="mt-5 flex items-center gap-2 rounded-xl bg-[#d92362] px-6 py-3 font-bold text-white"><Play className="size-5" aria-hidden="true" />{ready ? "Start video" : "Enable YouTube player"}</button> : null}
    {activation ? <p className="mt-3 text-sm text-muted-foreground">If your browser blocks playback, press Play inside the YouTube player.</p> : null}
    {loadError ? <p role="alert" className="mt-3 text-sm text-[#ffb0a2]">{loadError}</p> : null}
  </div>;
}

export function TvStage({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<PlaybackSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [ended, setEnded] = useState(false);
  const endedRef = useRef(false);
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

  return <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-7 sm:px-10">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5"><p className="text-xl font-black tracking-tight text-gradient">MyKaraoke <span className="text-white">TV</span></p><p className="font-mono text-sm tracking-widest text-[#ffc16f]">ROOM {code}</p></div>
    {ended ? <p role="alert" className="mt-12 text-[#ffb0a2]">This room ended or expired. Playback has stopped. Ask the host for a new room.</p> : null}
    {!state && !ended ? <p role="status" className="mt-12 text-muted-foreground">Connecting to the room…</p> : null}
    {state && !ended ? <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(15rem,0.6fr)]">
      <div>{state.current ? <YoutubeStage key={state.current.id} song={state.current} desired={state.desired} onEvent={onEvent} /> : <div className="grid aspect-video min-h-[240px] place-items-center rounded-2xl border border-white/10 bg-white/5 p-8 text-center"><div><p className="text-3xl font-black">Waiting for the next song</p><p className="mt-3 text-muted-foreground">The host will start playback when the party is ready.</p></div></div>}</div>
      <aside className="rounded-2xl border border-white/10 bg-white/5 p-6"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffc16f]">On stage</p><h1 className="mt-3 text-2xl font-black leading-tight">{state.current?.title ?? "No current song"}</h1><p className="mt-3 text-lg text-[#ffe4cd]">{state.current ? `Singer: ${state.current.singerName}` : "Waiting for the host"}</p><p className="mt-5 text-sm text-muted-foreground">Player state: {state.observed}</p>{state.observed === "blocked" ? <p role="alert" className="mt-3 text-sm text-[#ffc16f]">Playback was blocked. Press Play in the YouTube player on this display.</p> : null}{state.observed === "error" ? <p role="alert" className="mt-3 text-sm text-[#ffb0a2]">YouTube could not play this video (error {state.errorCode ?? "unknown"}). Ask the host to skip it.</p> : null}{state.next ? <div className="mt-6 border-t border-white/10 pt-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Up next</p><p className="mt-2 font-semibold">{state.next.title}</p><p className="text-sm text-muted-foreground">{state.next.singerName}</p></div> : null}</aside>
    </div> : null}
    {message ? <p role="status" className="pb-4 text-sm text-[#ffc16f]">{message}</p> : null}
    <p className="border-t border-white/10 pt-4 text-xs text-muted-foreground">YouTube playback uses the official embedded player. This display never receives host controls.</p>
  </main>;
}
