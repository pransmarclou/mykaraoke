import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FlaskConical, MonitorSmartphone } from "lucide-react";
import { BrowserReadiness } from "@/components/browser-readiness";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Browser and device readiness",
  description: "Check browser capabilities and review the current MyKaraoke device verification status.",
};

const verifiedEvidence = [
  "Automated responsive and accessibility shell checks in desktop and mobile Chromium.",
  "Host creation and reload on Safari for macOS against the deployed HTTPS app.",
  "MacBook Pro and USB EarPods microphone selection, activity, mute, and audible low-volume monitoring in Safari.",
  "Official YouTube sample playback in desktop Chromium.",
];

const openVerification = [
  "Physical iPhone and Android QR join, touch controls, reload, and recovery.",
  "Windows browser and built-in, USB, or Bluetooth microphone behavior.",
  "Physical TV browsers, remote-control focus, playback, and autoplay recovery.",
  "Bluetooth audio, measured latency, feedback risk, and microphone disconnect recovery.",
  "Firefox coverage; the current macOS browser runner is blocked before navigation.",
];

export default function CompatibilityPage() {
  return (
    <div className="page-shell flex min-h-screen flex-col">
      <SiteHeader />
      <main className="content-wrap flex-1 py-14 md:py-20">
        <section className="max-w-4xl" aria-labelledby="compatibility-title">
          <p className="eyebrow">Web MVP readiness</p>
          <h1 id="compatibility-title" className="mt-6 text-[clamp(3rem,7vw,6.2rem)] leading-[0.96] font-black tracking-[-0.07em]">
            Know what is ready before the party starts.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#c9bec3]">
            Check the browser in front of you, then review which real devices have evidence and which still need testing. Capability detection is not a compatibility promise.
          </p>
        </section>

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <BrowserReadiness />
          <section className="feature-panel rounded-[1.75rem] p-6 sm:p-8" aria-labelledby="support-meaning-title">
            <MonitorSmartphone className="size-8 text-[#ffad69]" strokeWidth={1.8} aria-hidden="true" />
            <h2 id="support-meaning-title" className="mt-5 text-2xl font-black tracking-tight">What this page can tell you</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              A detected API means the browser exposes a required building block. Actual support also depends on permissions, hardware, the network, YouTube playback policy, and how that device behaves during a full party.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button asChild className="rounded-full font-bold">
                <Link href="/host">Open host setup <ArrowRight className="ml-1 size-4" aria-hidden="true" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 bg-white/4 font-bold text-white hover:bg-white/10">
                <Link href="/join">Open guest join</Link>
              </Button>
            </div>
          </section>
        </div>

        <section className="mt-16" aria-labelledby="evidence-title">
          <div className="max-w-2xl">
            <p className="eyebrow">Evidence ledger</p>
            <h2 id="evidence-title" className="mt-4 text-4xl font-black tracking-[-0.05em]">Tested is different from detected.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">Status recorded October 20, 2026. This list will narrow into exact supported combinations as physical verification is completed.</p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <article className="feature-panel rounded-[1.5rem] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-6 text-emerald-300" aria-hidden="true" />
                <h3 className="text-xl font-black">Evidence recorded</h3>
              </div>
              <ul className="mt-6 grid gap-4">
                {verifiedEvidence.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-[#c9bec3]">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-300" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="feature-panel rounded-[1.5rem] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <FlaskConical className="size-6 text-[#ffb65a]" aria-hidden="true" />
                <h3 className="text-xl font-black">Still to verify</h3>
              </div>
              <ul className="mt-6 grid gap-4">
                {openVerification.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-[#c9bec3]">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#ffb65a]" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
