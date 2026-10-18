import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="content-wrap flex h-20 items-center justify-between gap-4 border-b border-white/8">
      <Link
        href="/"
        aria-label="MyKaraoke home"
        className="brand-lockup inline-flex items-center rounded-xl"
      >
        <Image src="/brand/microphone-logo.png" alt="" width={1402} height={1122} className="brand-icon" priority />
        <Image src="/brand/mykaraoke-wordmark.png" alt="" width={2172} height={724} className="brand-wordmark" priority />
      </Link>

      <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
        <Link href="/#how-it-works" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-white">
          How it works
        </Link>
        <Link href="/#the-experience" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-white">
          The experience
        </Link>
      </nav>

      <Button asChild size="lg" variant="outline" className="h-11 rounded-full border-white/18 bg-white/5 px-4 font-bold text-white hover:bg-white/10 sm:px-5">
        <Link href="/join">
          Join a party <ArrowUpRight className="ml-1 size-4" aria-hidden="true" />
        </Link>
      </Button>
    </header>
  );
}
