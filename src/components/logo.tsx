import { cn } from "@/lib/utils";

/**
 * The mark: a banknote outline with a coin in it. Inline SVG rather than an
 * image so it inherits currentColor and stays sharp from a 16px favicon to a
 * 64px landing.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-grid size-7 shrink-0 place-items-center rounded-[0.55rem] bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        className="size-[78%]"
      >
        <rect x="2" y="8" width="28" height="16" rx="3.4" />
        <circle cx="16" cy="16" r="3.6" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}
