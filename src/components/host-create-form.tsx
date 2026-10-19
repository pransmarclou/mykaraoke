"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HostCreateForm({ available }: { available: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function createRoom() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error("Room creation failed");
      router.refresh();
    } catch {
      setError("Could not create a room. Check the hosted service connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-9 max-w-xl">
      <Button type="button" size="lg" onClick={createRoom} disabled={pending} className="h-13 w-full rounded-full px-7 text-base font-bold sm:w-auto">
        {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-5" aria-hidden="true" />}
        {pending ? "Creating your room…" : "Create a room"}
      </Button>
      {!available ? <p role="alert" className="mt-4 text-sm text-[#ffb0a2]">The hosted service could not be reached when this page loaded. You can retry room creation now.</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-[#ffb0a2]">{error}</p> : null}
    </div>
  );
}
