"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InvitePanel({
  url,
  regenerate,
}: {
  url: string | null;
  regenerate: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);

  if (!url) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          The invite link expired. Generate a new one to bring people in.
        </p>
        <form action={regenerate} className="mt-3">
          <Button type="submit" variant="secondary" className="w-full">
            Generate link
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{url}</span>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="shrink-0 rounded-md bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Anyone with the link can join. They sign up or log in and land straight in the group. It
        expires in 30 days.
      </p>
      <form action={regenerate} className="mt-3">
        <Button type="submit" variant="ghost" size="sm" className="w-full">
          Revoke and regenerate
        </Button>
      </form>
    </div>
  );
}
