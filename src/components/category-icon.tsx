import type { Category } from "@/domain/categories";

/**
 * Static map rather than a lookup assembled at runtime: a dynamic emoji name is
 * invisible to the bundler and would be dropped from the build.
 */
export const CATEGORY_EMOJI: Record<Category, string> = {
  food: "🍕",
  fuel: "⛽",
  lodging: "🏠",
  groceries: "🛒",
  activity: "🎿",
  transport: "✈️",
  tickets: "🎟️",
  taxi: "🚕",
  drinks: "🍻",
  other: "📦",
  health: "💊",
  gift: "🎁",
};

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      {CATEGORY_EMOJI[category] ?? "📦"}
    </span>
  );
}
