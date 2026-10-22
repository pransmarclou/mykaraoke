"use client";

import { useEffect, useReducer, useState } from "react";
import { Circle, Crown, UsersRound } from "lucide-react";
import { presenceReducer, type Participant } from "@/lib/rooms/presence";

export function RoomParticipants({ code, guest = false, currentMemberId, canTransferHost = false }: { code: string; guest?: boolean; currentMemberId?: string; canTransferHost?: boolean }) {
  const [{ participants, status }, dispatch] = useReducer(presenceReducer, { participants: [], status: "loading" });
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [transferring, setTransferring] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function transferHost(targetMemberId: string) {
    setTransferring(targetMemberId);
    setMessage("");
    try {
      const response = await fetch(`/api/rooms/${code}/host`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetMemberId }),
      });
      const result = await response.json() as { participants?: Participant[]; error?: string };
      if (!response.ok || !result.participants) throw new Error(result.error ?? "Host transfer failed.");
      dispatch({ type: "snapshot", participants: result.participants });
      setMessage("Host controls transferred. Your phone is now a guest remote.");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not transfer host controls.");
    } finally {
      setTransferring(null);
    }
  }

  useEffect(() => {
    let active = true;
    async function update(method: "GET" | "POST") {
      try {
        const response = await fetch(`/api/rooms/${code}/presence`, { method, cache: "no-store" });
        if (!active) return;
        if (response.status === 410 || response.status === 404 || response.status === 403) {
          dispatch({ type: "ended" });
          return;
        }
        if (!response.ok) throw new Error("Presence unavailable");
        const result = (await response.json()) as { participants: Participant[]; expiresAt: string };
        if (active) {
          dispatch({ type: "snapshot", participants: result.participants });
          setExpiresAt(result.expiresAt);
          setNow(Date.now());
        }
      } catch {
        if (active) dispatch({ type: "interrupted" });
      }
    }

    void update(guest ? "POST" : "GET");
    const poll = window.setInterval(() => void update("GET"), 5_000);
    const heartbeat = guest ? window.setInterval(() => void update("POST"), 10_000) : undefined;
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    const onReconnect = () => void update(guest ? "POST" : "GET");
    window.addEventListener("online", onReconnect);
    return () => {
      active = false;
      window.clearInterval(poll);
      if (heartbeat) window.clearInterval(heartbeat);
      window.clearInterval(clock);
      window.removeEventListener("online", onReconnect);
    };
  }, [code, guest]);

  const remaining = expiresAt ? Date.parse(expiresAt) - now : Infinity;

  return (
    <section className="feature-panel rounded-[1.75rem] p-6 sm:p-8" aria-labelledby="room-people-title">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-[#ffad69]"><UsersRound className="size-5" aria-hidden="true" /></span>
        <div>
          <h2 id="room-people-title" className="text-xl font-black tracking-tight">In this room</h2>
          <p className="text-sm text-muted-foreground">{canTransferHost ? "Choose who leads the party" : "Host and guests"}</p>
        </div>
      </div>
      <ul className="mt-6 space-y-2" data-testid="participant-list">
        {participants.map((person) => (
          <li key={person.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3" data-testid="participant">
            <span className="min-w-0 truncate font-semibold">{person.label}{person.id === currentMemberId ? " (you)" : ""}</span>
            <span className="flex shrink-0 flex-wrap items-center gap-2">
              {person.isHost ? <span className="flex items-center gap-1 text-xs font-bold text-[#ffc16f]"><Crown className="size-3.5" aria-hidden="true" />Host</span> : null}
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Circle className={`size-2 fill-current ${person.online ? "text-[#ffbd56]" : "text-[#93858c]"}`} aria-hidden="true" />{person.online ? "Here" : "Away"}</span>
              {canTransferHost && !person.isHost ? <button type="button" disabled={transferring !== null} onClick={() => void transferHost(person.id)} className="queue-action">{transferring === person.id ? "Transferring…" : "Make host"}</button> : null}
            </span>
          </li>
        ))}
      </ul>
      {participants.length === 0 && status === "connected" ? <p className="mt-5 text-sm text-muted-foreground">No guests yet. Share the code to bring them in.</p> : null}
      {status === "loading" ? <p role="status" className="mt-5 text-sm text-muted-foreground">Loading guests…</p> : null}
      {status === "reconnecting" ? <p role="status" className="mt-5 text-sm text-[#ffc16f]">Connection interrupted. Reconnecting…</p> : null}
      {status === "ended" ? <p role="alert" className="mt-5 text-sm text-[#ffb0a2]">This room ended or your access expired. Return to Join to enter a new code.</p> : null}
      {status === "connected" && remaining > 0 && remaining <= 15 * 60_000 ? <p role="status" className="mt-5 text-sm text-[#ffc16f]">This room expires in {Math.max(1, Math.ceil(remaining / 60_000))} minute(s). Finish your songs or create a new room.</p> : null}
      {message ? <p role="status" className="mt-5 text-sm text-[#ffc16f]">{message}</p> : null}
    </section>
  );
}
