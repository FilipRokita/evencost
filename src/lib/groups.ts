import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { expenseSplits, expenses, groups, inviteLinks, memberships, settlements, users } from "@/db/schema";
import { computeBalances } from "@/domain/balances";
import type { MinorUnits } from "@/domain/money";
import type { Category } from "@/domain/categories";

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
type Queryable = Pick<typeof db, "select">;

export async function loadBalances(
  groupId: string,
  executor: Queryable = db,
): Promise<Record<string, MinorUnits>> {
  const [expenseRows, splitRows, settlementRows, memberRows] = await Promise.all([
    executor.select().from(expenses).where(and(eq(expenses.groupId, groupId), isNull(expenses.deletedAt))),
    executor
      .select({ expenseId: expenseSplits.expenseId, userId: expenseSplits.userId, amountMinor: expenseSplits.amountMinor })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenses.id, expenseSplits.expenseId))
      .where(eq(expenses.groupId, groupId)),
    executor.select().from(settlements).where(eq(settlements.groupId, groupId)),
    executor.select({ userId: memberships.userId }).from(memberships).where(eq(memberships.groupId, groupId)),
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

export type ExpenseListItem = {
  id: string;
  title: string;
  category: Category;
  amountMinor: number;
  paidByUserId: string;
  createdByUserId: string;
  spentOn: string;
  deletedAt: Date | null;
  splits: Record<string, number>;
};

/**
 * Most recent first, one page at a time. The cursor is the creation time of the
 * last row on the page, so a new expense arriving mid-scroll cannot shift the
 * page and make a row appear twice (rule 15).
 *
 * Balances elsewhere always compute over every expense; pagination only limits
 * what is displayed.
 */
export async function listExpenses(
  groupId: string,
  options: { limit?: number; before?: Date } = {},
): Promise<{ items: ExpenseListItem[]; nextCursor: Date | null }> {
  const limit = options.limit ?? 50;

  const rows = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.groupId, groupId),
        options.before ? lt(expenses.createdAt, options.before) : undefined,
      ),
    )
    .orderBy(desc(expenses.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  if (page.length === 0) return { items: [], nextCursor: null };

  const splitRows = await db
    .select()
    .from(expenseSplits)
    .where(inArray(expenseSplits.expenseId, page.map((row) => row.id)));

  const byExpense = new Map<string, Record<string, number>>();
  for (const split of splitRows) {
    const map = byExpense.get(split.expenseId) ?? {};
    map[split.userId] = split.amountMinor;
    byExpense.set(split.expenseId, map);
  }

  return {
    items: page.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      amountMinor: row.amountMinor,
      paidByUserId: row.paidByUserId,
      createdByUserId: row.createdByUserId,
      spentOn: row.spentOn,
      deletedAt: row.deletedAt,
      splits: byExpense.get(row.id) ?? {},
    })),
    nextCursor: hasMore ? page[page.length - 1].createdAt : null,
  };
}

export type SettlementListItem = {
  id: string;
  fromUserId: string;
  toUserId: string;
  amountMinor: number;
  note: string;
  reversedAt: Date | null;
  createdAt: Date;
};

/** Newest first. Reversed rows stay here, struck through, as history. */
export async function listSettlements(groupId: string): Promise<SettlementListItem[]> {
  const rows = await db
    .select()
    .from(settlements)
    .where(eq(settlements.groupId, groupId))
    .orderBy(desc(settlements.createdAt));

  return rows.map((row) => ({
    id: row.id,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    amountMinor: row.amountMinor,
    note: row.note,
    reversedAt: row.reversedAt,
    createdAt: row.createdAt,
  }));
}
