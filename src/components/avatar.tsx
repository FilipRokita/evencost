import { AVATAR_CLASS, initials, type AvatarColor } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export function Avatar({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  const tone = AVATAR_CLASS[color as AvatarColor] ?? AVATAR_CLASS.teal;
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white",
        tone,
        className,
      )}
      // The name is rendered next to it, so the initials add nothing for a reader.
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
