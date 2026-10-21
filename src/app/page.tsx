import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Headphones, Mic2, MonitorPlay, QrCode, Radio, UsersRound } from "lucide-react";
import { JoinForm } from "@/components/join-form";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const steps = [
  {
    number: "01",
    title: "Set the stage",
    description: "Open the host view on a laptop or a screen everyone can see.",
    icon: MonitorPlay,
  },
  {
    number: "02",
    title: "Bring everyone in",
    description: "Friends join with a room link, a code, or a quick QR scan.",
    icon: QrCode,
  },
  {
    number: "03",
    title: "Let the room sing",
    description: "Build a shared queue and give every singer their moment.",
    icon: UsersRound,
  },
];

export default function HomePage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main>
        <section className="content-wrap py-14 md:py-20" aria-labelledby="hero-title">
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow">Karaoke, together</p>
            <h1 id="hero-title" className="mt-7 text-[clamp(3.5rem,8vw,7rem)] leading-[0.94] font-black tracking-[-0.075em]">
              Your songs. <span className="text-gradient">Your stage.</span><br />
              Your party.
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-[#c9bec3]">
              Put the performance on the big screen, then let everyone use their phone to join the room and shape the queue.
            </p>
          </div>

          <div className="mx-auto mt-11 grid max-w-5xl items-stretch gap-4 md:grid-cols-2">
            <article className="feature-panel flex min-h-full flex-col rounded-[1.75rem] p-6 sm:p-8" aria-labelledby="host-card-title">
              <span className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#ffb91b] via-[#ff663e] to-[#f90082] shadow-[0_16px_44px_rgba(255,56,103,.2)]">
                <Image src="/brand/microphone-logo.png" alt="" width={1402} height={1122} className="h-12 w-14 object-contain" priority />
              </span>
              <p className="eyebrow mt-7">On the big screen</p>
              <h2 id="host-card-title" className="mt-3 text-3xl font-black tracking-[-0.045em]">Host a room</h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">Create the party, share its code or QR, manage the queue, and pair a separate TV browser for playback.</p>
              <Button asChild size="lg" className="mt-auto h-12 w-full rounded-xl pt-0 font-bold shadow-[0_12px_40px_rgba(255,35,105,.2)]">
                <Link href="/host">Start a room <ArrowRight className="ml-1 size-5" aria-hidden="true" /></Link>
              </Button>
            </article>

            <JoinForm variant="launch" />
          </div>

          <p className="mx-auto mt-6 flex max-w-5xl items-center justify-center gap-2 text-center text-sm text-[#a99ca4]">
            <Radio className="size-4 shrink-0 text-[#ffb33c]" aria-hidden="true" />
            Rooms, shared songs, TV playback, and local Microphone Studio are live.
          </p>
        </section>

        <section id="how-it-works" className="content-wrap scroll-mt-24 py-16 md:py-24" aria-labelledby="how-title">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">The flow</p>
              <h2 id="how-title" className="mt-4 max-w-2xl text-4xl font-black tracking-[-0.055em] sm:text-5xl">
                A whole party, one shared rhythm.
              </h2>
            </div>
            <p className="max-w-sm text-base leading-7 text-muted-foreground">
              Built for the big screen and the small ones in everyone’s hands.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map(({ number, title, description, icon: Icon }) => (
              <article key={number} className="feature-panel rounded-[1.5rem] p-7">
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-[#ffad69]">
                    <Icon className="size-6" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="text-xs font-black tracking-[0.2em] text-[#ad8394]">{number}</span>
                </div>
                <h3 className="mt-9 text-xl font-bold tracking-tight">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="the-experience" className="content-wrap scroll-mt-24 pb-24 pt-5 md:pb-32" aria-labelledby="experience-title">
          <div className="feature-panel relative overflow-hidden rounded-[2rem] px-7 py-12 sm:px-12 md:px-16 md:py-16">
            <div className="absolute -right-24 -top-32 size-96 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
            <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
              <div>
                <p className="eyebrow">Made for the moment</p>
                <h2 id="experience-title" className="mt-5 max-w-2xl text-4xl font-black tracking-[-0.055em] sm:text-5xl">
                  The music stays on. The party moves with you.
                </h2>
                <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">
                  A shared song queue, a clear TV view, and a dedicated microphone studio
                  keep every screen and singer connected to the same room.
                </p>
                <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-[#ead6da]">
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Phone friendly</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">TV focused</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Mic controls live</span>
                </div>
              </div>
              <div className="flex gap-3 md:flex-col" aria-hidden="true">
                <span className="grid size-16 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-[#ffb65a]"><Headphones className="size-7" /></span>
                <span className="grid size-16 place-items-center rounded-2xl border border-accent/25 bg-accent/10 text-[#ff8eaf]"><Mic2 className="size-7" /></span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
