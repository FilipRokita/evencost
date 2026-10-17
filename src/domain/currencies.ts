/**
 * The currencies a group can be created with. One per group, chosen once and
 * never editable (decision 5), so this list only grows by a migration-free code
 * change and a new option in the form.
 */
export const CURRENCIES = ["PLN", "EUR", "USD", "GBP"] as const;

export type Currency = (typeof CURRENCIES)[number];

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}
