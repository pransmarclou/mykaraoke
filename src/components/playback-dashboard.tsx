"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MonitorPlay, Pause, Play, SkipForward } from "lucide-react";
import { RoomReactions } from "@/components/room-reactions";
import type { PlaybackSnapshot, HostPlaybackAction } from "@/lib/playback/state";
import { singerLabel } from "@/lib/songs/singers";

async function readError(response: Response): Promise<string> {
  try { return ((await response.json()) as { error?: string }).error ?? "Please try again."; }
  catch { return "Please try again."; }
}

export function PlaybackDashboard({ code, role, tvUrl }: { code: string; role: "host" | "guest"; tvUrl?: string }) {
  const [state, setState] = useState<PlaybackSnapshot | null>(null);
  const [pairCode, setPairCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [connection, setConnection] = useState<"loading" | "connected" | "reconnecting" | "ended">("loading");
  const pendingCommand = useRef<{ action: HostPlaybackAction; key: string } | null>(null);
  const canRemote = role === "host" || Boolean(state?.guestPermissions.playbackControl);
  const canReact = role === "host" || Boolean(state?.guestPermissions.reactions);

  useEffect(() => {
    let active = true;
    let terminal = false;
    async function refresh() {
      if (terminal) return;
      try {
        const response = await fetch(`/api/rooms/${code}/playback`, { cache: "no-store" });
        if ([403, 404, 410].includes(response.status)) { if (active) { terminal = true; setState(null); setPairCode(""); setConnection("ended"); } return; }
        if (!response.ok) throw new Error("Playback unavailable");
        const snapshot = await response.json() as PlaybackSnapshot;
        if (active && !terminal) { setState((current) => !current || snapshot.version >= current.version ? snapshot : current); setConnection("connected"); }
      } catch { if (active && !terminal) setConnection("reconnecting"); }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 2_500);
    return () => { active = false; window.clearInterval(interval); };
  }, [code]);

  async function pair() {
    if (connection !== "connected") return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/rooms/${code}/playback/pair-code`, { method: "POST" });
      if (!response.ok) throw new Error(await readError(response));
      setPairCode(((await response.json()) as { pairCode: string }).pairCode);
      setMessage("Enter this code on the TV page within 10 minutes.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create a pairing code."); }
    finally { setBusy(false); }
  }

  async function command(action: HostPlaybackAction) {
    if (connection !== "connected") return;
    setBusy(true); setMessage("");
    const requestKey = pendingCommand.current?.action === action ? pendingCommand.current.key : crypto.randomUUID();
    pendingCommand.current = { action, key: requestKey };
    try {
      const response = await fetch(`/api/rooms/${code}/playback`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestKey }),
      });
      if (!response.ok) { pendingCommand.current = null; throw new Error(await readError(response)); }
      const snapshot = await response.json() as PlaybackSnapshot;
      setState((current) => !current || snapshot.version >= current.version ? snapshot : current);
      pendingCommand.current = null;
    } catch (error) { setMessage(error instanceof Error ? error.message : "Playback command failed."); }
    finally { setBusy(false); }
  }

  return <section className="feature-panel rounded-[1.75rem] p-6 sm:p-8" aria-labelledby={`playback-title-${role}`}>
    <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-[#ffad69]"><MonitorPlay className="size-5" aria-hidden="true" /></span><div><h2 id={`playback-title-${role}`} className="text-xl font-black tracking-tight">On stage</h2><p className="text-sm text-muted-foreground">{role === "host" ? "Control the paired TV from here" : canRemote ? "Your phone is a remote for the TV" : "See who is singing now"}</p></div></div>
    {connection === "ended" ? <p role="alert" className="mt-5 text-sm text-[#ffb0a2]">This room ended or your access expired. Playback controls are unavailable.</p> : null}
    {connection === "reconnecting" ? <p role="status" className="mt-5 text-sm text-[#ffc16f]">Playback connection interrupted. Reconnecting…</p> : null}
    {!state && connection === "loading" ? <p role="status" className="mt-5 text-sm text-muted-foreground">Loading playback state…</p> : null}
    {state && connection !== "ended" ? <>
      {state.current ? <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#ffc16f]">{state.observed === "playing" ? "Now playing" : "Current song"}</p><p className="mt-2 font-bold text-white">{state.current.title}</p><p className="mt-1 text-sm text-muted-foreground">Singer: {singerLabel(state.current)}</p><p className="mt-2 text-sm text-[#ffc16f]">Player: {state.observed}{state.observed === "error" ? ` (YouTube error ${state.errorCode ?? "unknown"})` : ""}</p></div> : <p className="mt-5 text-sm text-muted-foreground">No song is on stage yet.</p>}
      {state.next ? <p className="mt-4 text-sm text-muted-foreground">Up next: <span className="text-white">{state.next.title}</span> · {singerLabel(state.next)}</p> : null}
      {canReact ? <RoomReactions code={code} enabled={Boolean(state.current) && connection === "connected"} /> : <p className="mt-5 border-t border-white/10 pt-5 text-xs text-muted-foreground">The host has turned reactions off.</p>}
      {canRemote ? <div data-testid="playback-remote">
        <p className="mt-4 text-sm text-muted-foreground">TV: {state.tvConnected ? "connected" : state.devicePaired ? "paired, waiting for connection" : "not paired"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!state.current ? <button type="button" disabled={busy || connection !== "connected" || !state.next || !state.devicePaired} onClick={() => void command("start")} className="queue-action"><Play className="size-4" aria-hidden="true" />Start next song</button> : <>
            <button type="button" disabled={busy || connection !== "connected"} onClick={() => void command(state.desired === "play" ? "pause" : "resume")} className="queue-action">{state.desired === "play" ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}{state.desired === "play" ? "Pause" : "Resume"}</button>
            <button type="button" disabled={busy || connection !== "connected"} onClick={() => void command("skip")} className="queue-action"><SkipForward className="size-4" aria-hidden="true" />Skip current</button>
          </>}
        </div>
      </div> : null}
      {role === "host" ? <>
        <div className="mt-6 border-t border-white/10 pt-5"><Link href={tvUrl ?? `/tv/${code}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#ffad69] underline underline-offset-4">Open TV page</Link><p className="mt-2 text-xs text-muted-foreground">On another screen, open this page and enter a pairing code. A room code alone cannot control playback.</p><button type="button" disabled={busy || connection !== "connected"} onClick={() => void pair()} className="queue-action mt-3">{pairCode ? "Generate new pairing code" : "Generate TV pairing code"}</button>
          {pairCode ? <p data-testid="tv-pair-code" className="mt-3 font-mono text-2xl font-black tracking-[0.2em] text-white">{pairCode}</p> : null}
        </div>
      </> : null}
    </> : null}
    {message ? <p role="status" className="mt-4 text-sm text-[#ffc16f]">{message}</p> : null}
  </section>;
}
