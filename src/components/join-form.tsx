"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeRoomCode } from "@/lib/rooms/room-code-format";

export function JoinForm({ initialCode = "", variant = "panel" }: { initialCode?: string; variant?: "panel" | "launch" }) {
  const [code, setCode] = useState(initialCode);
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, displayName }),
      });
      const result = (await response.json()) as { code?: string; error?: string };
      if (!response.ok || !result.code) {
        setError(result.error ?? "Could not join this room. Try again.");
        return;
      }
      // The HttpOnly cookie changed; load the authenticated RSC directly rather than racing push() with refresh().
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/room/${result.code}`);
    } catch {
      setError("Connection lost. Check your network and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className={`feature-panel max-w-xl rounded-[1.75rem] p-6 sm:p-8 ${variant === "panel" ? "mt-9" : "min-h-full"}`}>
      <p className="text-xs font-black uppercase tracking-[0.15em] text-[#ffad69]">{variant === "launch" ? "On your phone" : "Step into the room"}</p>
      {variant === "launch" ? <h2 className="mt-3 text-3xl font-black tracking-[-0.045em]">Join the party</h2> : null}
      <p className="mt-3 text-sm leading-7 text-muted-foreground">Use the host&apos;s six-character code or open their invite link. No account needed.</p>
      <div className="mt-5">
        <label htmlFor="room-code" className="mb-2 block text-sm font-semibold text-white">Room code</label>
        <input id="room-code" type="text" autoComplete="off" autoCapitalize="characters" inputMode="text" required maxLength={10} placeholder="ABC234" value={code} onChange={(event) => setCode(normalizeRoomCode(event.target.value))} className="h-12 w-full rounded-xl border border-white/20 bg-white/5 px-4 font-mono text-base tracking-widest text-white placeholder:text-[#a99ca4]" />
      </div>
      <div className="mt-4">
        <label htmlFor="display-name" className="mb-2 block text-sm font-semibold text-white">Your display name</label>
        <input id="display-name" type="text" autoComplete="nickname" required maxLength={24} placeholder="How should we call you?" value={displayName} onChange={(event) => setDisplayName(event.target.value)} aria-describedby="name-hint" className="h-12 w-full rounded-xl border border-white/20 bg-white/5 px-4 text-base text-white placeholder:text-[#a99ca4]" />
        <p id="name-hint" className="mt-2 text-xs leading-5 text-muted-foreground">2–24 characters. If someone has the same name, we&apos;ll add a number.</p>
      </div>
      {error ? <p role="alert" className="mt-4 text-sm text-[#ffb0a2]">{error}</p> : null}
      <Button type="submit" disabled={pending} size="lg" className="mt-5 h-12 w-full rounded-xl font-bold">
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
        {pending ? "Joining…" : "Join room"}
      </Button>
    </form>
  );
}
