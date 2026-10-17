/**
 * A closed set. The database enum is built from this list, so there is one place
 * to add a category and no way for the two to drift apart. Icons are a UI
 * concern and live there; this is only the vocabulary.
 */
export const CATEGORIES = [
  "food",
  "fuel",
  "lodging",
  "groceries",
  "activity",
  "transport",
  "tickets",
  "taxi",
  "drinks",
  "other",
  "health",
  "gift",
] as const;

export type Category = (typeof CATEGORIES)[number];
