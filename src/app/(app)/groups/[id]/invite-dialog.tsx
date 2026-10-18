"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CopyState = { url: string; status: "copied" | "failed" } | null;

export function InviteDialog({
  url,
  regenerate,
  trigger,
}: {
  url: string | null;
  /** Present only for the owner: managing links is an owner action. */
  regenerate?: () => Promise<void>;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Tied to the URL it describes, so a regenerated or closed link cannot show
  // a stale "Copied" badge.
  const [copyState, setCopyState] = useState<CopyState>(null);
  const copyStatus = copyState?.url === url ? copyState.status : null;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    setCopyState(null);
  }

  async function copy() {
    if (!url) return;
    if (!navigator.clipboard?.writeText) {
      setCopyState({ url, status: "failed" });
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopyState({ url, status: "copied" });
      setTimeout(() => {
        setCopyState((current) =>
          current?.url === url && current.status === "copied" ? null : current,
        );
      }, 2000);
    } catch {
      setCopyState({ url, status: "failed" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite people</DialogTitle>
          <DialogDescription>
            Anyone with the link can join. They sign up or log in and land straight in the group.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {url ? (
          <>
            <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                {url}
              </span>
              <button
                type="button"
                onClick={copy}
                className="shrink-0 rounded-md bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy"}
              </button>
            </div>

            {copyStatus === "failed" && (
              <p role="alert" className="text-xs text-destructive">
                Could not copy. Select the link above and copy it by hand.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              The link expires 30 days after it was generated.
              {regenerate
                ? " Regenerating revokes this one for everyone."
                : " Only the owner can generate or revoke links."}
            </p>

            {regenerate && (
              <form action={regenerate} className="border-t border-border pt-4">
                <Button type="submit" variant="secondary" className="w-full">
                  Revoke and regenerate
                </Button>
              </form>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4">
            <p className="text-sm text-muted-foreground">
              {regenerate
                ? "The invite link expired. Generate a new one to bring people in."
                : "The invite link expired. Ask the owner for a new one."}
            </p>
            {regenerate && (
              <form action={regenerate} className="mt-3">
                <Button type="submit" variant="secondary" className="w-full">
                  Generate link
                </Button>
              </form>
            )}
          </div>
        )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
