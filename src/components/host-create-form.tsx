"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HostCreateForm({
  available,
  variant = "page",
}: {
  available: boolean;
  variant?: "page" | "launch";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function createRoom() {
    if (!available) {
      router.push("/host");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ display: variant === "launch" ? "tv" : "host" }) });
      if (!response.ok) throw new Error("Room creation failed");
      const { code } = await response.json() as { code: string };
      // The same action creates a new room or resumes this browser's active
      // host session. The fetch has already committed the HttpOnly cookie
      // before this navigation starts.
      router.push(variant === "launch" ? `/tv/${code}` : "/host");
      router.refresh();
    } catch {
      setError("Could not create a room. Check the hosted service connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={variant === "launch" ? "mt-auto pt-7" : "mt-9 max-w-xl"}>
      <Button type="button" size="lg" onClick={createRoom} disabled={pending} className={variant === "launch" ? "h-14 w-full rounded-xl px-7 text-base font-black shadow-[0_14px_38px_rgba(217,35,98,.28)]" : "h-13 w-full rounded-full px-7 text-base font-bold sm:w-auto"}>
        {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-5" aria-hidden="true" />}
        {pending ? "Starting your session…" : variant === "launch" ? "Start session" : "Create a room"}
      </Button>
      {!available ? <p role="alert" className="mt-4 text-sm text-[#ffb0a2]">The hosted service could not be reached when this page loaded. You can retry room creation now.</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-[#ffb0a2]">{error}</p> : null}
    </div>
  );
}
