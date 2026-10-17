import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { expenseSplits, expenses, groups, inviteLinks, memberships, settlements, users } from "@/db/schema";
import { computeBalances } from "@/domain/balances";
import type { MinorUnits } from "@/domain/money";

export type GroupRow = typeof groups.$inferSelect;

/**
 * Returns the group only if the viewer is an active member of it. A missing
 * membership and a missing group are the same answer on purpose: the caller
 * renders a 404 either way, so nobody can use the response to learn which group
 * ids exist (rule 10).
 */
export async function getGroupForViewer(groupId: string, viewerId: string): Promise<GroupRow | null> {
  const [row] = await db
    .select({ group: groups })
    .from(groups)
    .innerJoin(
      memberships,
      and(eq(memberships.groupId, groups.id), eq(memberships.userId, viewerId)),
    )
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt), isNull(memberships.leftAt)))
    .limit(1);

  return row?.group ?? null;
}

export type MemberRow = {
  id: string;
  displayName: string;
  avatarColor: string;
  leftAt: Date | null;
};

export async function listMembers(groupId: string): Promise<MemberRow[]> {
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarColor: users.avatarColor,
      leftAt: memberships.leftAt,
      joinedAt: memberships.joinedAt,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.groupId, groupId))
    .orderBy(memberships.joinedAt);

  return rows.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    avatarColor: row.avatarColor,
    leftAt: row.leftAt,
  }));
}

/** Groups the viewer is an active member of, newest first. */
export async function listGroupsForViewer(viewerId: string): Promise<GroupRow[]> {
  const rows = await db
    .select({ group: groups })
    .from(groups)
    .innerJoin(
      memberships,
      and(eq(memberships.groupId, groups.id), eq(memberships.userId, viewerId)),
    )
    .where(and(isNull(groups.deletedAt), isNull(memberships.leftAt)))
    .orderBy(groups.createdAt);

  return rows.map((row) => row.group);
}

/**
 * Balances for a group, computed from its expenses and settlements. There is no
 * stored balance to read (see src/domain/balances.ts), so this joins the rows and
 * hands them to the pure function.
 */
export async function loadBalances(groupId: string): Promise<Record<string, MinorUnits>> {
  const [expenseRows, splitRows, settlementRows, memberRows] = await Promise.all([
    db.select().from(expenses).where(and(eq(expenses.groupId, groupId), isNull(expenses.deletedAt))),
    db
      .select({ expenseId: expenseSplits.expenseId, userId: expenseSplits.userId, amountMinor: expenseSplits.amountMinor })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
      .where(eq(expenses.groupId, groupId)),
    db.select().from(settlements).where(eq(settlements.groupId, groupId)),
    db.select({ userId: memberships.userId }).from(memberships).where(eq(memberships.groupId, groupId)),
  ]);

  const splitsByExpense = new Map<string, { userId: string; amountMinor: number }[]>();
  for (const split of splitRows) {
    const list = splitsByExpense.get(split.expenseId) ?? [];
    list.push({ userId: split.userId, amountMinor: split.amountMinor });
    splitsByExpense.set(split.expenseId, list);
  }

  return computeBalances(
    expenseRows.map((expense) => ({
      amountMinor: expense.amountMinor,
      paidByUserId: expense.paidByUserId,
      splits: splitsByExpense.get(expense.id) ?? [],
      deletedAt: expense.deletedAt,
    })),
    settlementRows.map((settlement) => ({
      fromUserId: settlement.fromUserId,
      toUserId: settlement.toUserId,
      amountMinor: settlement.amountMinor,
      reversedAt: settlement.reversedAt,
    })),
    memberRows.map((member) => member.userId),
  );
}

/** The invite link a member should share right now, if one is still usable. */
export async function getActiveInvite(groupId: string) {
  const [invite] = await db
    .select()
    .from(inviteLinks)
    .where(and(eq(inviteLinks.groupId, groupId), isNull(inviteLinks.revokedAt)))
    .orderBy(desc(inviteLinks.createdAt))
    .limit(1);

  if (!invite || invite.expiresAt.getTime() <= Date.now()) return null;
  return invite;
}
