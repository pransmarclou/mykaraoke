import Link from "next/link";
import { ArrowRight, Headphones, Mic2, MonitorPlay, QrCode, Radio, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StageIllustration } from "@/components/stage-illustration";

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
        <section className="content-wrap grid items-center gap-12 py-16 md:grid-cols-[1.04fr_0.96fr] md:gap-14 md:py-24" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">Karaoke, together</p>
            <h1 id="hero-title" className="mt-7 max-w-2xl text-[clamp(3.7rem,8.4vw,7.3rem)] leading-[0.96] font-black tracking-[-0.075em]">
              Your songs.<br />
              <span className="text-gradient">Your stage.</span><br />
              Your party.
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-[#c9bec3]">
              One screen for the performance. Every phone in on the fun.
              MyKaraoke is bringing the whole room into the music.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-13 rounded-full bg-primary px-7 text-base font-bold shadow-[0_12px_40px_rgba(255,35,105,.25)] hover:bg-[#b91d50]">
                <Link href="/host">Explore hosting <ArrowRight className="ml-1 size-5" aria-hidden="true" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-13 rounded-full border-white/20 bg-white/4 px-7 text-base font-bold text-white hover:bg-white/10">
                <Link href="/join">Explore joining</Link>
              </Button>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-[#a99ca4]">
              <Radio className="size-4 text-[#ffb33c]" aria-hidden="true" />
              Rooms, shared songs, TV playback, and local Microphone Studio are live.
            </p>
          </div>
          <StageIllustration />
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
                  are on the roadmap. Each part will be released when it works across devices.
                </p>
                <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-[#ead6da]">
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Phone friendly</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">TV focused</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Mic ready roadmap</span>
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
