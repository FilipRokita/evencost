import {
  Beer,
  Car,
  Fuel,
  Gift,
  House,
  Mountain,
  Package,
  Pill,
  Pizza,
  Plane,
  ShoppingCart,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/domain/categories";

/**
 * Static map rather than a lookup assembled at runtime: a dynamic class or icon
 * name is invisible to the bundler and would be dropped from the build.
 */
export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  food: Pizza,
  fuel: Fuel,
  lodging: House,
  groceries: ShoppingCart,
  activity: Mountain,
  transport: Plane,
  tickets: Ticket,
  taxi: Car,
  drinks: Beer,
  other: Package,
  health: Pill,
  gift: Gift,
};

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = CATEGORY_ICON[category] ?? Package;
  return <Icon className={className} aria-hidden="true" />;
}
