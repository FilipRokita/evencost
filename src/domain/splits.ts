import type { MinorUnits } from "./money";

export type SplitError =
  | "no-participants"
  | "invalid-total"
  | "invalid-part"
  | "parts-do-not-sum"
  | "percents-do-not-sum";

export type SplitResult =
  | { ok: true; splits: Record<string, MinorUnits> }
  | { ok: false; error: SplitError };

const fail = (error: SplitError): SplitResult => ({ ok: false, error });

function isValidTotal(total: MinorUnits): boolean {
  return Number.isInteger(total) && total >= 0;
}

/**
 * Splits evenly, with the leftover cents handed out one each. The same input
 * always produces the same output because the leftover goes to participants in
 * the order they were given.
 */
export function splitEqually(
  total: MinorUnits,
  memberIds: readonly string[],
): SplitResult {
  if (memberIds.length === 0) return fail("no-participants");
  if (!isValidTotal(total)) return fail("invalid-total");

  const base = Math.floor(total / memberIds.length);
  let leftover = total - base * memberIds.length;

  const splits: Record<string, MinorUnits> = {};
  for (const id of memberIds) {
    const extra = leftover > 0 ? 1 : 0;
    splits[id] = base + extra;
    leftover -= extra;
  }

  return { ok: true, splits };
}

/** Exact amounts, which have to add up to the total before anything is stored. */
export function splitExact(
  total: MinorUnits,
  parts: Record<string, MinorUnits>,
): SplitResult {
  const entries = Object.entries(parts);
  if (entries.length === 0) return fail("no-participants");
  if (!isValidTotal(total)) return fail("invalid-total");

  let sum = 0;
  for (const [, amount] of entries) {
    if (!Number.isInteger(amount) || amount < 0) return fail("invalid-part");
    sum += amount;
  }
  if (sum !== total) return fail("parts-do-not-sum");

  return { ok: true, splits: { ...parts } };
}

/**
 * Percentages, largest remainder. The leftover cents go only to participants
 * with a share above zero: a 0% member must land on exactly zero, or they end up
 * carrying a balance for an expense they were not part of.
 */
export function splitByPercent(
  total: MinorUnits,
  percents: Record<string, number>,
): SplitResult {
  const entries = Object.entries(percents);
  if (entries.length === 0) return fail("no-participants");
  if (!isValidTotal(total)) return fail("invalid-total");

  let sum = 0;
  for (const [, percent] of entries) {
    if (!Number.isFinite(percent) || percent < 0) return fail("invalid-part");
    sum += percent;
  }
  // Percentages are decimals in a text field, so compare with a tolerance.
  if (Math.abs(sum - 100) > 1e-9) return fail("percents-do-not-sum");

  const shares = entries.map(([userId, percent]) => {
    const exact = (total * percent) / 100;
    const amount = Math.floor(exact);
    return { userId, percent, amount, fraction: exact - amount };
  });

  const leftover = total - shares.reduce((acc, s) => acc + s.amount, 0);

  const eligible = shares
    .filter((s) => s.percent > 0)
    .sort((a, b) => b.fraction - a.fraction || a.userId.localeCompare(b.userId));

  for (let i = 0; i < leftover; i += 1) {
    eligible[i % eligible.length].amount += 1;
  }

  const splits: Record<string, MinorUnits> = {};
  for (const share of shares) splits[share.userId] = share.amount;

  return { ok: true, splits };
}
