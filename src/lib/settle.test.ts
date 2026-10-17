import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseSplits, expenses, groups, memberships, users } from "@/db/schema";
import { netting } from "@/domain/netting";
import { loadBalances } from "./groups";
import { recordSuggestedTransfers } from "./settle";

/**
 * These run against the local database because the rule under test is the row
 * lock, and a mock cannot have one. The fixture is a throwaway group, deleted at
 * the end, so the demo seed is untouched.
 */
const createdGroups: string[] = [];
const createdUsers: string[] = [];

async function makeUser(name: string): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({ email: `${name}-${randomUUID()}@settle.test`, displayName: name, avatarColor: "teal" })
    .returning({ id: users.id });
  createdUsers.push(user.id);
  return user.id;
}

async function makeGroup(debt: number) {
  const [a, b, c] = [await makeUser("Anna"), await makeUser("Bartek"), await makeUser("Celina")];
  const [group] = await db
    .insert(groups)
    .values({ name: `test-${randomUUID()}`, currency: "PLN", ownerId: a })
    .returning({ id: groups.id });
  createdGroups.push(group.id);

  await db.insert(memberships).values([a, b, c].map((userId) => ({ groupId: group.id, userId })));

  // Anna pays, the cost is shared three ways, so both others owe her.
  const [expense] = await db
    .insert(expenses)
    .values({
      groupId: group.id,
      title: "fixture",
      category: "other",
      amountMinor: debt,
      paidByUserId: a,
      createdByUserId: a,
      spentOn: "2026-10-01",
    })
    .returning({ id: expenses.id });

  const share = Math.floor(debt / 3);
  await db.insert(expenseSplits).values(
    [a, b, c].map((userId, index) => ({
      expenseId: expense.id,
      userId,
      amountMinor: index === 0 ? debt - share * 2 : share,
    })),
  );

  return group.id;
}

afterAll(async () => {
  for (const id of createdGroups) await db.delete(groups).where(eq(groups.id, id));
  for (const id of createdUsers) await db.delete(users).where(eq(users.id, id));
});

describe("recordSuggestedTransfers", () => {
  it("settles the group and empties every balance", async () => {
    const groupId = await makeGroup(90_000);
    const before = await loadBalances(groupId);
    const transfers = netting(before);

    const recorded = await recordSuggestedTransfers(groupId, transfers);
    expect(recorded).toBe(transfers.length);

    const after = await loadBalances(groupId);
    expect(Object.values(after).every((value) => value === 0)).toBe(true);
  });

  it("does nothing when everybody is already even", async () => {
    const groupId = await makeGroup(9_000);
    await recordSuggestedTransfers(groupId, netting(await loadBalances(groupId)));

    const second = await recordSuggestedTransfers(groupId, [
      { fromUserId: createdUsers[1], toUserId: createdUsers[0], amountMinor: 3000 },
    ]);
    expect(second).toBe(0);
  });

  it("never counts the same transfer twice when two settle-ups race", async () => {
    const groupId = await makeGroup(90_000);
    // Both people compute the same suggestions from the same starting balances.
    const transfers = netting(await loadBalances(groupId));

    const [first, second] = await Promise.all([
      recordSuggestedTransfers(groupId, transfers),
      recordSuggestedTransfers(groupId, transfers),
    ]);

    // One of them records the transfers; the other finds nothing left to settle.
    expect(Math.min(first, second)).toBe(0);
    expect(Math.max(first, second)).toBe(transfers.length);

    const after = await loadBalances(groupId);
    expect(Object.values(after).every((value) => value === 0)).toBe(true);
  });
});
