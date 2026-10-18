import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="page-shell min-h-screen">
      <SiteHeader />
      <main className="content-wrap flex min-h-[70vh] flex-col items-start justify-center py-20">
        <p className="eyebrow">Page not found</p>
        <h1 className="mt-5 text-5xl font-black tracking-tight sm:text-7xl">No song at this address.</h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">The page you requested is not part of MyKaraoke.</p>
        <Button asChild size="lg" className="mt-8 h-12 rounded-full px-6">
          <Link href="/"><ArrowLeft className="size-4" aria-hidden="true" /> Return home</Link>
        </Button>
      </main>
    </div>
  );
}
