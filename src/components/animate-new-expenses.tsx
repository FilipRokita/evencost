"use client";

import { useEffect } from "react";

const ANIMATION = [
  "animate-in",
  "fade-in",
  "slide-in-from-top-1",
  "duration-200",
  "motion-reduce:animate-none",
];

/**
 * Animates expense rows added after the page has mounted. Rows that were
 * already there on load stay still.
 */
export function AnimateNewExpenses({ targetId }: { targetId: string }) {
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          const rows = node.matches("[data-expense-row]")
            ? [node]
            : [...node.querySelectorAll("[data-expense-row]")];
          for (const row of rows) row.classList.add(...ANIMATION);
        }
      }
    });

    observer.observe(target, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [targetId]);

  return null;
}
