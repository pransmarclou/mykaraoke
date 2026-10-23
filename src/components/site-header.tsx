import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, LogIn, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PartyThemePicker } from "@/components/party-theme-picker";
import { accountLabel } from "@/lib/auth/rules";
import { getCurrentUser } from "@/lib/auth/server";

export async function SiteHeader({ showThemePicker = true, variant = "default" }: { showThemePicker?: boolean; variant?: "default" | "hero" }) {
  const user = await getCurrentUser();
  return (
    <header className={`${variant === "hero" ? "home-content-wrap" : "content-wrap"} relative z-20 flex h-20 items-center justify-between gap-4 ${variant === "hero" ? "border-transparent" : "border-b border-white/8"}`}>
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
        <Button asChild size="lg" variant="ghost" className="h-11 rounded-full px-3 font-bold text-white hover:bg-white/10 sm:px-4">
          <Link href="/account" aria-label={user ? `Account: ${accountLabel(user.user_metadata, user.email)}` : "Sign in or create an account"}>
            {user ? <UserRound className="size-4" aria-hidden="true" /> : <LogIn className="size-4" aria-hidden="true" />}
            <span className="hidden max-w-28 truncate lg:inline">{user ? accountLabel(user.user_metadata, user.email) : "Sign in"}</span>
          </Link>
        </Button>
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
