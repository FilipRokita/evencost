import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseSplits, expenses, groups, memberships, users } from "@/db/schema";
import { getGroupForViewer, listExpenses, loadBalances } from "./groups";

const createdGroups: string[] = [];
const createdUsers: string[] = [];

async function makeUser(name: string): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({ email: `${name}-${randomUUID()}@groups.test`, displayName: name, avatarColor: "teal" })
    .returning({ id: users.id });
  createdUsers.push(user.id);
  return user.id;
}

async function makeGroup(owner: string, member: string): Promise<string> {
  const [group] = await db
    .insert(groups)
    .values({ name: `groups-${randomUUID()}`, currency: "PLN", ownerId: owner })
    .returning({ id: groups.id });
  createdGroups.push(group.id);
  await db.insert(memberships).values([
    { groupId: group.id, userId: owner },
    { groupId: group.id, userId: member },
  ]);
  return group.id;
}

afterAll(async () => {
  for (const id of createdGroups) await db.delete(groups).where(eq(groups.id, id));
  for (const id of createdUsers) await db.delete(users).where(eq(users.id, id));
});

describe("getGroupForViewer", () => {
  it("returns the group only to someone who is still an active member", async () => {
    const owner = await makeUser("Owner");
    const member = await makeUser("Member");
    const outsider = await makeUser("Outsider");
    const groupId = await makeGroup(owner, member);

    expect(await getGroupForViewer(groupId, owner)).not.toBeNull();
    expect(await getGroupForViewer(groupId, outsider)).toBeNull();

    await db
      .update(memberships)
      .set({ leftAt: new Date() })
      .where(and(eq(memberships.groupId, groupId), eq(memberships.userId, member)));
    expect(await getGroupForViewer(groupId, member)).toBeNull();
  });
});

describe("listExpenses", () => {
  it("pages newest first, while balances still see every expense", async () => {
    const owner = await makeUser("Owner");
    const member = await makeUser("Member");
    const groupId = await makeGroup(owner, member);
    const base = new Date("2026-01-01T00:00:00Z");

    for (let index = 0; index < 3; index += 1) {
      const [expense] = await db
        .insert(expenses)
        .values({
          groupId,
          title: `Expense ${index}`,
          category: "other",
          amountMinor: 1000,
          paidByUserId: owner,
          createdByUserId: owner,
          spentOn: "2026-01-01",
          createdAt: new Date(base.getTime() + index * 1000),
        })
        .returning({ id: expenses.id });

      await db.insert(expenseSplits).values([
        { expenseId: expense.id, groupId, userId: owner, amountMinor: 500 },
        { expenseId: expense.id, groupId, userId: member, amountMinor: 500 },
      ]);
    }

    const first = await listExpenses(groupId, { limit: 2 });
    expect(first.items.map((item) => item.title)).toEqual(["Expense 2", "Expense 1"]);
    expect(first.nextCursor).toBeInstanceOf(Date);

    const second = await listExpenses(groupId, {
      limit: 2,
      before: first.nextCursor ?? undefined,
    });
    expect(second.items.map((item) => item.title)).toEqual(["Expense 0"]);
    expect(second.nextCursor).toBeNull();

    // Pagination is display only: all three expenses still move the balances.
    const balances = await loadBalances(groupId);
    expect(balances[owner]).toBe(1500);
    expect(balances[member]).toBe(-1500);
  });
});
