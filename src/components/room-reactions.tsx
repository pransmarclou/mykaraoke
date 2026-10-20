"use client";

import { useState } from "react";
import { ROOM_REACTIONS, type RoomReactionId } from "@/lib/reactions/rules";

async function responseError(response: Response): Promise<string> {
  try {
    return ((await response.json()) as { error?: string }).error ?? "Please try again.";
  } catch {
    return "Please try again.";
  }
}
export function RoomReactions({ code, enabled }: { code: string; enabled: boolean }) {
  const [sending, setSending] = useState<RoomReactionId | null>(null);
  const [message, setMessage] = useState("");

  async function send(reaction: RoomReactionId) {
    if (!enabled || sending) return;
    setSending(reaction);
    setMessage("");
    try {
      const response = await fetch(`/api/rooms/${code}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });
      if (!response.ok) {
        setMessage(await responseError(response));
        return;
      }
      const selected = ROOM_REACTIONS.find((item) => item.id === reaction);
      setMessage(`${selected?.label ?? "Reaction"} sent to the TV.`);
    } catch {
      setMessage("Could not send your reaction. Check your connection and try again.");
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <p className="text-sm font-bold text-white">Cheer the singer</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Reactions briefly appear on the paired TV and are not saved.
      </p>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Send a reaction">
        {ROOM_REACTIONS.map((reaction) => (
          <button
            key={reaction.id}
            type="button"
            aria-label={`Send ${reaction.label}`}
            disabled={!enabled || sending !== null}
            onClick={() => void send(reaction.id)}
            className="grid min-h-11 min-w-12 place-items-center rounded-xl border border-white/15 bg-white/5 px-3 text-2xl transition hover:bg-white/10 disabled:opacity-45"
          >
            <span aria-hidden="true">{reaction.emoji}</span>
          </button>
        ))}
      </div>
      {!enabled ? <p className="mt-3 text-xs text-muted-foreground">Reactions unlock while a singer is on stage.</p> : null}
      {message ? <p role="status" className="mt-3 text-xs text-[#ffc16f]">{message}</p> : null}
    </div>
  );
}
