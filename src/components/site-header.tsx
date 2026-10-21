import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartyThemePicker } from "@/components/party-theme-picker";

export function SiteHeader({ showThemePicker = true }: { showThemePicker?: boolean }) {
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
        <Link href="/host" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-white">
          Host
        </Link>
        <Link href="/#how-it-works" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-white">
          How it works
        </Link>
        <Link href="/compatibility" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-white">
          Compatibility
        </Link>
      </nav>

      <div className="flex items-center gap-2">
        {showThemePicker ? <PartyThemePicker /> : null}
        <Button asChild size="lg" variant="outline" className="h-11 rounded-full border-white/18 bg-white/5 px-3 font-bold text-white hover:bg-white/10 sm:px-5">
          <Link href="/join" aria-label="Join a party">
            <span className="hidden sm:inline">Join a party</span>
            <ArrowUpRight className="size-4 sm:ml-1" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
