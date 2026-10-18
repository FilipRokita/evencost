export type MemberView = {
  userId: string;
  /** Set when the member left. Their history stays, their access does not. */
  leftAt: Date | null;
};

export type GroupView = {
  ownerId: string;
  members: readonly MemberView[];
};

export type ExpenseView = {
  createdByUserId: string;
  deletedAt: Date | null;
};

export type SettlementView = {
  fromUserId: string;
  reversedAt: Date | null;
};

/**
 * Every check starts here: a member who left is treated as a stranger, not as
 * someone with historical rights. The owner never leaves, so there is always one
 * person able to correct anything in the group.
 */
export function isActiveMember(group: GroupView, userId: string): boolean {
  return group.members.some((m) => m.userId === userId && m.leftAt === null);
}

/**
 * Ownership of an expense is the creator, never the payer. A payer whose balance
 * is wrong because somebody mistyped the amount has no rights over the record.
 */
export function canEditExpense(actorId: string, group: GroupView, expense: ExpenseView): boolean {
  if (!isActiveMember(group, actorId) || expense.deletedAt) return false;
  return group.ownerId === actorId || expense.createdByUserId === actorId;
}

export function canDeleteExpense(actorId: string, group: GroupView, expense: ExpenseView): boolean {
  return canEditExpense(actorId, group, expense);
}

export function canSettle(actorId: string, group: GroupView): boolean {
  return isActiveMember(group, actorId);
}

/** The owner, or the person who sent the money. Reversing a reversal is pointless. */
export function canReverseSettlement(
  actorId: string,
  group: GroupView,
  settlement: SettlementView,
): boolean {
  if (!isActiveMember(group, actorId) || settlement.reversedAt) return false;
  return group.ownerId === actorId || settlement.fromUserId === actorId;
}

/** Invite links and removing people. */
export function canManageGroup(actorId: string, group: GroupView): boolean {
  return isActiveMember(group, actorId) && group.ownerId === actorId;
}

export function canDeleteGroup(actorId: string, group: GroupView): boolean {
  return canManageGroup(actorId, group);
}

export function canEditGroup(actorId: string, group: GroupView): boolean {
  return canManageGroup(actorId, group);
}

/** Anyone but the owner: ownership is not transferable in v1. */
export function canLeaveGroup(actorId: string, group: GroupView): boolean {
  return isActiveMember(group, actorId) && group.ownerId !== actorId;
}
