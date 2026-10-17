/**
 * Money is an integer count of minor units everywhere: cents, grosze, whatever
 * the currency's hundredth is. Floats are never used because 0.1 + 0.2 is not
 * 0.3, and a balance that is off by a fraction of a cent is a bug nobody can
 * explain.
 */
export type MinorUnits = number;

/**
 * Parses user input into minor units. Accepts a comma as the decimal separator,
 * because that is what a Polish or German keyboard produces.
 *
 * Returns null rather than NaN so the caller has to deal with bad input.
 */
export function toMinorUnits(input: string): MinorUnits | null {
  const normalised = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return null;
  // Rounding guards against 0.29 * 100 evaluating to 28.999999999999996.
  return Math.round(Number(normalised) * 100);
}

/**
 * One format everywhere: the currency code in front, the same way for every
 * currency. Mixing "PLN 291.60" with "€1,672.30" in one list reads as a bug.
 */
export function formatMoney(amount: MinorUnits, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(amount / 100);
}
