"use client";

import { ListMusic, UserRoundPlus } from "lucide-react";
import { createPortal } from "react-dom";
import { partyNotificationMessage, type PartyNotification } from "@/lib/rooms/notification-rules";

export function PartyNotificationToasts({ events }: { events: readonly PartyNotification[] }) {
  if (events.length === 0 || typeof document === "undefined") return null;
  return createPortal(
    <div className="pointer-events-none fixed top-20 right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" aria-label="Party notifications" data-testid="party-notifications">
      {events.map((event) => {
        const Icon = event.kind === "member_joined" ? UserRoundPlus : ListMusic;
        return (
          <div key={event.id} className="party-notification flex items-start gap-3 rounded-2xl border border-white/15 bg-[#15131d]/95 p-4 text-left text-white shadow-2xl backdrop-blur-xl" data-testid="party-notification">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-accent"><Icon className="size-5" aria-hidden="true" /></span>
            <span className="min-w-0 pt-0.5 text-sm font-semibold leading-5">{partyNotificationMessage(event)}</span>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
