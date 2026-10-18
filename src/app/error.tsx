"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("MyKaraoke page error", error);
  }, [error]);

  return (
    <div className="page-shell flex min-h-screen items-center justify-center p-6">
      <main className="feature-panel max-w-lg rounded-3xl p-9 text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-5 text-3xl font-black tracking-tight">The stage is taking a moment.</h1>
        <p className="mt-4 text-muted-foreground">Please try this page again. Your browser does not need to be restarted.</p>
        <Button onClick={reset} size="lg" className="mt-7 h-12 rounded-full px-7">Try again</Button>
      </main>
    </div>
  );
}
