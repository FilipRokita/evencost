import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { groups, inviteLinks, memberships, users } from "@/db/schema";
import { joinByToken } from "./invite";

/**
 * These run against the real database because the rule is about the membership
 * row, not about a value the code returns. The fixtures are removed afterwards.
 */
const createdGroups: string[] = [];
const createdUsers: string[] = [];

async function makeUser(name: string): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({ email: `${name}-${randomUUID()}@invite.test`, displayName: name, avatarColor: "teal" })
    .returning({ id: users.id });
  createdUsers.push(user.id);
  return user.id;
}

async function makeGroup(): Promise<string> {
  const owner = await makeUser("Owner");
  const [group] = await db
    .insert(groups)
    .values({ name: `invite-${randomUUID()}`, currency: "PLN", ownerId: owner })
    .returning({ id: groups.id });
  createdGroups.push(group.id);
  await db.insert(memberships).values({ groupId: group.id, userId: owner });
  return group.id;
}

async function makeInvite(
  groupId: string,
  options: { expiresAt?: Date; revokedAt?: Date } = {},
): Promise<string> {
  const token = randomUUID().replace(/-/g, "");
  await db.insert(inviteLinks).values({
    groupId,
    token,
    expiresAt: options.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    revokedAt: options.revokedAt,
  });
  return token;
}

async function membershipCount(userId: string): Promise<number> {
  const rows = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(eq(memberships.userId, userId));
  return rows.length;
}

afterAll(async () => {
  for (const id of createdGroups) await db.delete(groups).where(eq(groups.id, id));
  for (const id of createdUsers) await db.delete(users).where(eq(users.id, id));
});

describe("joinByToken", () => {
  it("joins once, and opening the same link again changes nothing", async () => {
    const groupId = await makeGroup();
    const token = await makeInvite(groupId);
    const userId = await makeUser("Nina");

    expect(await joinByToken(token, userId)).toBe(groupId);
    expect(await membershipCount(userId)).toBe(1);

    expect(await joinByToken(token, userId)).toBe(groupId);
    expect(await membershipCount(userId)).toBe(1);
  });

  it("lets someone who left come back without duplicating the row", async () => {
    const groupId = await makeGroup();
    const token = await makeInvite(groupId);
    const userId = await makeUser("Ola");

    await joinByToken(token, userId);
    await db
      .update(memberships)
      .set({ leftAt: new Date() })
      .where(eq(memberships.userId, userId));

    expect(await joinByToken(token, userId)).toBe(groupId);
    expect(await membershipCount(userId)).toBe(1);

    const [membership] = await db
      .select({ leftAt: memberships.leftAt })
      .from(memberships)
      .where(eq(memberships.userId, userId));
    expect(membership.leftAt).toBeNull();
  });

  it("refuses a revoked or expired link", async () => {
    const groupId = await makeGroup();
    const userId = await makeUser("Piotr");
    const revoked = await makeInvite(groupId, { revokedAt: new Date() });
    const expired = await makeInvite(groupId, { expiresAt: new Date(Date.now() - 1000) });

    expect(await joinByToken(revoked, userId)).toBeNull();
    expect(await joinByToken(expired, userId)).toBeNull();
    expect(await membershipCount(userId)).toBe(0);
  });

  it("refuses a link to a deleted group", async () => {
    const groupId = await makeGroup();
    const token = await makeInvite(groupId);
    const userId = await makeUser("Rafał");
    await db.update(groups).set({ deletedAt: new Date() }).where(eq(groups.id, groupId));

    expect(await joinByToken(token, userId)).toBeNull();
    expect(await membershipCount(userId)).toBe(0);
  });
});
