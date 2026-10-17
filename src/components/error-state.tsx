"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** The designed failure state: plain words and a way back, never a stack trace. */
export function ErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Where a real deployment would ship this to an error tracker.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col items-center justify-center px-5 text-center">
      <h1 className="text-xl font-extrabold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A database hiccup or a bug on our side. Nothing you did.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
