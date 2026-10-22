"use client";

import { useState } from "react";
import Image from "next/image";
import { Music2 } from "lucide-react";
import { youtubeThumbnailUrl } from "@/lib/songs/thumbnail";

export function SongThumbnail({ youtubeId, className = "w-24 sm:w-28" }: { youtubeId: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = youtubeThumbnailUrl(youtubeId);
  return <span className={`grid aspect-video shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10 ${className}`}>
    {src && !failed
      ? <Image src={src} alt="" width={320} height={180} unoptimized loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      : <Music2 className="size-6 text-[#ffc16f]" aria-hidden="true" />}
  </span>;
}

export function formatDuration(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
