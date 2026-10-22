import Image from "next/image";
import { Headphones, Mic2, MonitorPlay, QrCode, Radio, UsersRound } from "lucide-react";
import { HostCreateForm } from "@/components/host-create-form";
import { JoinForm } from "@/components/join-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { hasDatabaseConfiguration } from "@/lib/db";

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
  const roomCreationAvailable = hasDatabaseConfiguration();

  return (
    <div className="page-shell">
      <section className="home-hero" aria-labelledby="hero-title">
        <video autoPlay muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} className="home-hero-video motion-reduce:hidden">
          <source src="/media/tv-videoke-family-loop.mp4" type="video/mp4" />
        </video>
        <div className="home-hero-shade" aria-hidden="true" />
        <SiteHeader variant="hero" />
        <div className="home-content-wrap relative z-10 flex min-h-[calc(100svh-5rem)] flex-col justify-center py-12 md:py-16">
          <div className="mx-auto max-w-6xl text-center">
            <p className="eyebrow">One room. Every voice.</p>
            <h1 id="hero-title" className="mt-6 text-[clamp(3.7rem,9vw,8.8rem)] leading-[0.84] font-black tracking-[-0.078em]">
              Your songs. <span className="text-gradient">Your stage.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-[clamp(1rem,1.7vw,1.35rem)] leading-8 text-[#d9cfd3]">
              Start the room on the big screen, then let every singer join and shape the queue from their phone.
            </p>
          </div>

          <div className="home-launch-grid mx-auto mt-10 grid w-full max-w-6xl items-stretch gap-4 lg:grid-cols-2">
            <article className="home-launch-card flex min-h-full flex-col rounded-[1.4rem] p-6 sm:p-8" aria-labelledby="host-card-title">
              <span className="grid size-14 place-items-center rounded-2xl border border-[#ffb252]/30 bg-[#ff9c2e]/10 text-[#ffb65a]">
                <Image src="/brand/microphone-logo.png" alt="" width={1402} height={1122} className="h-10 w-11 object-contain" priority />
              </span>
              <p className="eyebrow mt-6">Lead the party</p>
              <h2 id="host-card-title" className="mt-3 text-3xl font-black tracking-[-0.045em]">Host a room</h2>
              <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">Create or resume your secure room, share the code, and control the paired playback screen.</p>
              <HostCreateForm available={roomCreationAvailable} variant="launch" />
            </article>

            <JoinForm variant="launch" />
          </div>

          <p className="mx-auto mt-6 flex max-w-5xl items-center justify-center gap-2 text-center text-sm text-[#b9adb3]">
            <Radio className="size-4 shrink-0 text-[#ffb33c]" aria-hidden="true" />
            No app or account required for the web MVP.
          </p>
        </div>
      </section>
      <main>
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
