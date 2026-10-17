/**
 * The eight hues validated for the dark palette. The value stored on the account
 * is one of these keys; the class map is static because Tailwind cannot see a
 * class name assembled at runtime and would drop it.
 */
export const AVATAR_COLORS = [
  "teal",
  "amber",
  "violet",
  "sky",
  "rose",
  "lime",
  "fuchsia",
  "orange",
] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const AVATAR_CLASS: Record<AvatarColor, string> = {
  teal: "bg-[#0d9488]",
  amber: "bg-[#d97706]",
  violet: "bg-[#7c3aed]",
  sky: "bg-[#0284c7]",
  rose: "bg-[#e11d48]",
  lime: "bg-[#65a30d]",
  fuchsia: "bg-[#c026d3]",
  orange: "bg-[#c2410c]",
};

/** Picked once at signup and stored; never recomputed from position. */
export function pickAvatarColor(): AvatarColor {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
