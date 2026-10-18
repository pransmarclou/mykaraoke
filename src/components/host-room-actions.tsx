"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HostRoomActions({ code, joinUrl }: { code: string; joinUrl: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setError("");
    } catch {
      setError("Copy was blocked. Select the link above to copy it manually.");
    }
  }

  async function endRoom() {
    if (!window.confirm("End this room? Its code and host session will stop working.")) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${code}/close`, { method: "POST" });
      if (!response.ok) throw new Error("Room close failed");
      router.refresh();
    } catch {
      setError("Could not end the room. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" size="lg" onClick={copyLink} className="rounded-full px-6 font-bold">
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "Link copied" : "Copy invite link"}
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={endRoom} disabled={pending} className="rounded-full border-white/20 bg-white/5 px-6 font-bold text-white hover:bg-white/10">
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
          End room
        </Button>
      </div>
      {error ? <p role="alert" className="mt-4 text-sm text-[#ffb0a2]">{error}</p> : null}
    </div>
  );
}
