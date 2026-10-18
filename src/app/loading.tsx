export default function Loading() {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center p-6">
      <div role="status" className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
        <span className="size-3 animate-pulse rounded-full bg-primary" aria-hidden="true" />
        Loading MyKaraoke…
      </div>
    </div>
  );
}
