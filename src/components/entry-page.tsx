import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";
import { JoinForm } from "@/components/join-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

type EntryPageProps = {
  joinCode?: string;
};

export function EntryPage({ joinCode }: EntryPageProps) {
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <SiteHeader />
      <main className="content-wrap flex flex-1 items-center py-14 md:py-20">
        <div className="grid w-full items-center gap-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
          <div>
            <Link href="/" className="mb-10 flex w-fit items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-white">
              <ArrowLeft className="size-4" aria-hidden="true" /> Back to home
            </Link>
            <p className="eyebrow">The guest experience</p>
            <h1 className="mt-6 max-w-2xl text-[clamp(3.2rem,6vw,6rem)] leading-[0.98] font-black tracking-[-0.07em]">
              Your next song starts here.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#c9bec3]">Join your host&apos;s room with a code or invite link. You&apos;ll see the party here before songs arrive in a later phase.</p>
            <JoinForm initialCode={joinCode} />
            <Link href="/host" className="mt-7 inline-flex items-center gap-2 rounded-sm text-sm font-bold text-[#ffad69] underline decoration-[#ff8c34]/50 underline-offset-4 hover:text-white">
              Explore hosting
            </Link>
          </div>

          <div className="entry-illustration grid place-items-center" role="img" aria-label="Abstract room invitation illustration">
            <span className="relative z-10 grid size-28 place-items-center rounded-[2rem] border border-white/20 bg-gradient-to-br from-[#ffb91b] via-[#ff663e] to-[#f90082] shadow-[0_0_0_22px_rgba(255,78,81,.08),0_0_80px_rgba(255,78,81,.35)]">
              <QrCode className="size-14 text-white" strokeWidth={1.6} aria-hidden="true" />
            </span>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
