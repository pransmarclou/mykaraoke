import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="content-wrap flex flex-col gap-4 border-t border-white/10 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>© {new Date().getFullYear()} MyKaraoke. Made by Nook Studio.</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/" className="rounded-sm hover:text-white">Home</Link>
        <Link href="/#how-it-works" className="rounded-sm hover:text-white">How it works</Link>
        <Link href="/host" className="rounded-sm hover:text-white">Host</Link>
        <Link href="/join" className="rounded-sm hover:text-white">Join</Link>
        <Link href="/compatibility" className="rounded-sm hover:text-white">Compatibility</Link>
      </div>
    </footer>
  );
}
