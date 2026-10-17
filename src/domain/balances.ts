import type { MinorUnits } from "./money";

export type ExpenseInput = {
  amountMinor: MinorUnits;
  paidByUserId: string;
  splits: readonly { userId: string; amountMinor: MinorUnits }[];
  deletedAt: Date | null;
};

export type SettlementInput = {
  fromUserId: string;
  toUserId: string;
  amountMinor: MinorUnits;
  reversedAt: Date | null;
};

/**
 * Balances are derived on every read, never stored. A stored balance is one more
 * thing that can disagree with the expenses it came from.
 *
 * Positive means the group owes this person; negative means they owe the group.
 * Soft-deleted expenses and reversed settlements are left out, so removing one
 * moves the numbers immediately and nothing has to be recalculated by hand.
 */
export function computeBalances(
  expenses: readonly ExpenseInput[],
  settlements: readonly SettlementInput[],
  participantIds: readonly string[],
): Record<string, MinorUnits> {
  const balances: Record<string, MinorUnits> = {};
  for (const id of participantIds) balances[id] = 0;

  for (const expense of expenses) {
    if (expense.deletedAt) continue;
    balances[expense.paidByUserId] = (balances[expense.paidByUserId] ?? 0) + expense.amountMinor;
    for (const split of expense.splits) {
      balances[split.userId] = (balances[split.userId] ?? 0) - split.amountMinor;
    }
  }

  for (const settlement of settlements) {
    if (settlement.reversedAt) continue;
    // Paying moves both sides toward zero: the sender's debt shrinks, so their
    // balance rises; the receiver's claim shrinks, so theirs falls. Getting this
    // backwards doubles debts instead of clearing them.
    balances[settlement.fromUserId] = (balances[settlement.fromUserId] ?? 0) + settlement.amountMinor;
    balances[settlement.toUserId] = (balances[settlement.toUserId] ?? 0) - settlement.amountMinor;
  }

  return balances;
}

/** What the whole group still has to move. The two sides always add up to this. */
export function outstandingTotal(balances: Record<string, MinorUnits>): MinorUnits {
  return Object.values(balances).reduce((total, value) => (value > 0 ? total + value : total), 0);
}
