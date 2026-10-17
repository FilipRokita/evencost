"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { ExpenseDialog } from "./expense-dialog";

/**
 * The header pair scrolls away with the page, so on a phone the add action
 * reappears as a floating button. It is the same dialog, not a second form.
 */
export function FloatingExpense({
  sentinelId,
  ...props
}: Omit<React.ComponentProps<typeof ExpenseDialog>, "trigger"> & { sentinelId: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel) return;

    const observer = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelId]);

  if (!shown) return null;

  return (
    <div className="fixed right-4 bottom-6 z-30 md:hidden">
      <ExpenseDialog
        {...props}
        trigger={
          <button
            type="button"
            aria-label="Add expense"
            className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/30 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="size-6" aria-hidden="true" />
          </button>
        }
      />
    </div>
  );
}
