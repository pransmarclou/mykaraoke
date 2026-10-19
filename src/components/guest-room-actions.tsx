"use client";

import { useState } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GuestRoomActions({ code }: { code: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function leave() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${code}/leave`, { method: "POST" });
      if (!response.ok) throw new Error("Leave failed");
      // The guest cookie was removed; a full navigation cannot reuse the previous room's RSC payload.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/join");
    } catch {
      setError("Could not leave the room. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <div><Button type="button" variant="outline" onClick={leave} disabled={pending} className="mt-7 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10">{pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}Leave room</Button>{error ? <p role="alert" className="mt-3 text-sm text-[#ffb0a2]">{error}</p> : null}</div>;
}
