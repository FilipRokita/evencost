import type { MinorUnits } from "./money";

export type Transfer = {
  fromUserId: string;
  toUserId: string;
  amountMinor: MinorUnits;
};

/**
 * Turns a set of balances into the transfers that clear them.
 *
 * Greedy: repeatedly match the largest debtor with the largest creditor. This
 * always settles everything, and never needs more than n-1 transfers, but it is
 * not guaranteed to find the smallest possible set. That problem is NP-hard, so
 * the UI must say "optimized", never "minimal".
 */
export function netting(balances: Record<string, MinorUnits>): Transfer[] {
  const creditors = Object.entries(balances)
    .filter(([, amount]) => amount > 0)
    .map(([userId, amount]) => ({ userId, amount }));
  const debtors = Object.entries(balances)
    .filter(([, amount]) => amount < 0)
    .map(([userId, amount]) => ({ userId, amount: -amount }));

  // Sorted by size, ties broken by id, so the same balances always produce the
  // same list of transfers.
  const largestFirst = (a: { userId: string; amount: number }, b: { userId: string; amount: number }) =>
    b.amount - a.amount || a.userId.localeCompare(b.userId);
  creditors.sort(largestFirst);
  debtors.sort(largestFirst);

  const transfers: Transfer[] = [];
  let creditor = 0;
  let debtor = 0;

  while (creditor < creditors.length && debtor < debtors.length) {
    const amount = Math.min(creditors[creditor].amount, debtors[debtor].amount);

    transfers.push({
      fromUserId: debtors[debtor].userId,
      toUserId: creditors[creditor].userId,
      amountMinor: amount,
    });

    creditors[creditor].amount -= amount;
    debtors[debtor].amount -= amount;
    if (creditors[creditor].amount === 0) creditor += 1;
    if (debtors[debtor].amount === 0) debtor += 1;
  }

  return transfers;
}
