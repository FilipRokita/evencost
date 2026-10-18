"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";

/**
 * On a phone the bar stays put while the page scrolls. Once the group actions
 * leave the viewport, the wordmark gives way to the group name, so the bar
 * always says where you are.
 */
export function GroupTopbar({ name, sentinelId }: { name: string; sentinelId: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel) return;

    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelId]);

  return (
    <header className="sticky top-0 z-20 -mx-4 flex items-center gap-3 bg-background px-4 py-4 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-7">
      <Link
        href="/dashboard"
        aria-label="Back to your groups"
        className="grid size-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
      </Link>

      <span
        aria-hidden="true"
        className={`min-w-0 flex-1 truncate text-sm font-bold transition-opacity duration-150 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      >
        {name}
      </span>

      <Link
        href="/dashboard"
        tabIndex={scrolled ? -1 : undefined}
        className={`flex items-center gap-2 text-base font-extrabold tracking-tight transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
          scrolled ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <Logo />
        EvenCost
      </Link>

      <div className="pointer-events-none absolute inset-x-0 top-full h-6 bg-linear-to-b from-background to-transparent md:hidden" />
    </header>
  );
}
